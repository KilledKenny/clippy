package main

import (
	"fmt"
	"github.com/patrickmn/go-cache"
	"io"
	"io/ioutil"
	"log"
	"net/http"
	"regexp"
	"time"
)

type Item struct {
	//ID string
	Last time.Time
	Data []byte
}

var (
	regB64                 *regexp.Regexp = regexp.MustCompile("^[A-z0-9_-]*$")
	CacheDefaultExpiration                = 5 * time.Minute
	CacheCleanupInterval                  = 10 * time.Minute
	Cache                                 = cache.New(CacheDefaultExpiration, CacheCleanupInterval)
	MaxTotalData           int64          = 32 << 20 // 32 MB
	MaxData                int64          = 1 << 20  // 1 MB
	MaxItems               int            = 200
	DataSize               int64          = 0
)

func init() {
	Cache.OnEvicted(func(key string, i interface{}) {
		b, ok := i.([]byte)
		if !ok {
			log.Println("Bad")
		}
		DataSize = DataSize - int64(len(b))
	})
}

func MethodID(m string, r *http.Request) (string, int, error) {
	if r.Method != m {
		return "", 405, fmt.Errorf("Not a %s request", m)
	}
	id := r.URL.Query().Get("ID")
	if len(id) < 50 || len(id) > 100 || !regB64.MatchString(id) {
		return "", 400, fmt.Errorf("id error")
	}
	return id, 0, nil

}
func Add(ID string, data []byte) (err error) {
	if int64(len(data)) > MaxData {
		return fmt.Errorf("Coppy to big")
	}
	if DataSize+int64(len(data)) > MaxTotalData {
		return fmt.Errorf("Out of memory :(")
	}
	Cache.Delete(ID)
	if err = Cache.Add(ID, data, cache.DefaultExpiration); err != nil {
		return
	}
	DataSize = DataSize + int64(len(data))
	return
}

func put(w http.ResponseWriter, r *http.Request) {
	ID, code, err := MethodID("PUT", r)
	if err != nil {
		w.WriteHeader(code)
		w.Write([]byte(err.Error()))
		return
	}
	if r.ContentLength >= MaxData {
		w.WriteHeader(413)
		w.Write([]byte("Max data is 1 MB"))
		return
	}
	lr := &io.LimitedReader{r.Body, MaxData}
	var tmp []byte
	tmp, err = ioutil.ReadAll(lr)
	if err != nil {
		w.WriteHeader(500)
		w.Write([]byte(err.Error()))
		return
	}
	err = Add(ID, tmp)
	if err != nil {
		w.WriteHeader(500)
		w.Write([]byte(err.Error()))
		return
	}
	w.Write([]byte("ok\n" + ID))
}

func get(w http.ResponseWriter, r *http.Request) {
	ID, code, err := MethodID("GET", r)
	if err != nil {
		w.WriteHeader(code)
		w.Write([]byte(err.Error()))
	}
	i, ok := Cache.Get(ID)
	if !ok {
		w.WriteHeader(422)
		w.Write([]byte("Nothing copied"))
		return
	}
	b, ok := i.([]byte)
	if !ok {
		w.WriteHeader(418)
		w.Write([]byte("Bad"))
		return
	}
	w.WriteHeader(200)
	w.Write(b)

}

func main() {
	myHandler := http.NewServeMux()
	myHandler.Handle("/", http.FileServer(http.Dir("www")))
	myHandler.HandleFunc("/api/put/", put)
	myHandler.HandleFunc("/api/get/", get)

	loopback := false
	loopback = false
	host := ""
	if loopback {
		host = "127.0.0.1"
	}

	s := &http.Server{
		Addr:           host + ":8081",
		Handler:        myHandler,
		MaxHeaderBytes: 1 << 20,
	}
	log.Println("Starting server")
	s.ListenAndServeTLS("server.crt", "server.key")
}
