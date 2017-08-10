# clippy

## How to run


#### From sorurce

    $ go get github.com/KilledKenny/clippy
    $ cd "$GOPATH/src/github.com/KilledKenny/clippy"
    $ go install
    $ ./$GOPATH/clippy

#### Prebuilt
Download a prebuilt zip from [GoBuilder](https://gobuilder.me/github.com/KilledKenny/clippy) it will contain the server binary and the www folder

## Certs

The server has to be served over https due Crome security features. Clippy has a built in https server however it dose not generate its own cert. Heres how to generate the cert and key whit openssl

    $ openssl genrsa -out server.key 2048
    $ openssl ecparam -genkey -name secp384r1 -out server.key
    $ openssl req -new -x509 -sha256 -key server.key -out server.crt -days 3650
