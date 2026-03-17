# Sandrone-AutoIndex

Another autoindex UI for nginx (and angie).

> [!WARNING]
> This project is entirely vibe-coded, expect bugs and slow maintenance :)

## Why?

This autoindex UI uses HTML to render instead of XSLT, which in my opinion is simpler.

## Usage

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

### Optional WebDAV client

This UI can act as a lightweight WebDAV upload client, note that it is unstable and should be used for convenience only.

Example nginx setup for public reads + authenticated writes, plus a verified sign-in check:

```conf
location = /_autoindex/auth-check {
    auth_basic "Sandrone WebDAV";
    auth_basic_user_file conf/htpasswd;

    add_header Cache-Control "no-store" always;

    limit_except GET HEAD {
        deny all;
    }

    try_files /__autoindex_auth_check_never_exists__ =204;
}

location / {
    root data/webdav;
    autoindex on;

    add_before_body /_autoindex/before.html;
    add_after_body  /_autoindex/after.html;

    sub_filter '<head>' '<head><meta name="viewport" content="width=device-width, initial-scale=1.0">';
    sub_filter_once off;

    dav_methods PUT;
    create_full_put_path on;
    client_max_body_size 2g;

    limit_except GET HEAD {
        auth_basic "Sandrone WebDAV";
        auth_basic_user_file conf/htpasswd;
    }
}
```

## License

[MIT](./LICENSE)
