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


## License

[MIT](./LICENSE)
