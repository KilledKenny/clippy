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
	"flag"
	"strconv"
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

var (
	FlagPort int
	FlagHttps bool
	FlagHost string
)

func init() {
	flag.IntVar(&FlagPort, "port", 0, "http port 0 for defalt")
	flag.BoolVar(&FlagHttps, "https", true, "enable https")
	flag.StringVar(&FlagHost, "host", "127.0.0.1", "")
	flag.Parse()

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
	w.Header().Add("Content-Type", "text/plain; charset=utf-8")
	w.Header().Add("X-Content-Type-Options", "nosniff")
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
	w.Write([]byte("ok\n"))
}

func get(w http.ResponseWriter, r *http.Request) {
	w.Header().Add("Content-Type", "text/plain; charset=utf-8")
	w.Header().Add("X-Content-Type-Options", "nosniff")
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


	if FlagPort != 0 {
		FlagHost = FlagHost + ":" + strconv.Itoa(FlagPort)
	}

	s := &http.Server{
		Addr:           FlagHost,
		Handler:        myHandler,
		MaxHeaderBytes: 1 << 20,
	}
	log.Println("Starting server")
	if FlagHttps {
		log.Println(s.ListenAndServeTLS("server.crt", "server.key"))
	}else {
		log.Println(s.ListenAndServe())
	}
}
