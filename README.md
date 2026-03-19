# Sandrone-AutoIndex

Another autoindex theme (and a WebDAV client) for nginx.

> [!WARNING]
> This project is fully vibe-coded, expect many hidden bugs and slow maintenance :)

## Why?

This autoindex UI uses HTML to render instead of XSLT, which in my opinion is simpler and also more customizable.

## Usage

### Basic usage

This will just install the autoindex without any optional features.

1. Copy the theme to `_autoindex` folder.
2. Config `nginx.conf` as below:
```conf
location / {
    root data/webdav;
    autoindex on;
    add_before_body /_autoindex/before.html;
    add_after_body  /_autoindex/after.html;
    sub_filter '<head>' '<head><meta name="viewport" content="width=device-width, initial-scale=1.0">';
    sub_filter_once off;
}
location /_autoindex/ {
    alias data/webdav/_autoindex/;
}
```
In this config, the `_autoindex` folder is inside `data/webdav/` folder for your reference. 

### Basic WebDAV client

This UI can also act as a WebDAV client, which supports basic file management directly in the web.
> [!NOTE]
> It is unstable and should be used for convenience only.

Example nginx config for the WebDAV server to be supported by this web UI:

```conf
location = /_autoindex/auth-check {
    auth_basic "Sandrone";
    auth_basic_user_file conf/htpasswd;
    add_header Cache-Control "no-store" always;
    limit_except GET HEAD {
        deny all;
    }
    try_files /__autoindex_auth_check_never_exists__ =204;
}
location / {
    root data/webdav;
    client_max_body_size 18G;
    dav_methods PUT DELETE MKCOL COPY MOVE;
    dav_ext_methods PROPFIND OPTIONS;
    create_full_put_path on;
    dav_access user:rw group:rw all:r;
    autoindex on;
    add_before_body /_autoindex/before.html;
    add_after_body  /_autoindex/after.html;
    sub_filter '<head>' '<head><meta name="viewport" content="width=device-width, initial-scale=1.0">';
    sub_filter_once off;
    # Require auth for everything, but allow anonymous reads
    auth_basic "Sandrone";
    auth_basic_user_file /etc/angie/webdav.passwd;
    satisfy any;
    # Anonymous access only for read methods
    limit_except PUT DELETE MKCOL COPY MOVE PATCH {
        allow all;
    }
}
```

### Anubis integration

Too hard, you should figure out yourself, but TL;DR follow the Anubis setup guide and add WebDAV methods to bypass Anubis and go directly to the backend server.

## License

[MIT](./LICENSE)
