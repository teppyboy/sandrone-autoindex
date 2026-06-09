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
    sub_filter_once on;
}
location /_autoindex/ {
    alias data/webdav/_autoindex/;
    autoindex off;
    add_header Cache-Control "no-cache";
}
```
In this config, the `_autoindex` folder is inside `data/webdav/` folder for your reference. 

### Reusable remote assets

Large decorative assets are hosted by the project demo instead of bundled in the
release archive. The Sandrone background defaults to:

```text
https://sandrone-autoindex.tretrauit.me/demo/assets/bg/140384272_p0.jpg
```

This keeps client installs small. To self-host the image, define this CSS
variable before loading `assets/index.css`:

```html
<style>
  :root {
    --sandrone-bg-image: url('/_autoindex/assets/bg/140384272_p0.jpg');
  }
</style>
```

The live demo is published at `https://sandrone-autoindex.tretrauit.me/demo/`.

### Basic WebDAV client

This UI can also act as a WebDAV client, which supports basic file management directly in the web.
> [!NOTE]
> It is unstable and should be used for convenience only.

Example nginx config for the WebDAV server to be supported by this web UI:

```conf
location = /_autoindex/auth-check {
    auth_basic "Sandrone";
    auth_basic_user_file /etc/nginx/webdav.htpasswd;
    add_header Cache-Control "no-store" always;
    limit_except GET HEAD {
        deny all;
    }
    try_files /__autoindex_auth_check_never_exists__ =204;
}
location /_autoindex/ {
    alias data/webdav/_autoindex/;
    autoindex off;
    dav_methods off;
    add_header Cache-Control "no-cache";
}
location / {
    root data/webdav;
    client_max_body_size 1G; # choose the real upload limit for your site

    add_header Allow "GET, HEAD, OPTIONS, PUT, DELETE, MKCOL, MOVE" always;
    add_header DAV "1, 2" always;
    add_header MS-Author-Via "DAV" always;
    if ($request_method = OPTIONS) {
        return 204;
    }

    dav_methods PUT DELETE MKCOL MOVE;
    create_full_put_path off;
    dav_access user:rw group:r all:r;

    autoindex on;
    add_before_body /_autoindex/before.html;
    add_after_body  /_autoindex/after.html;
    sub_filter '<head>' '<head><meta name="viewport" content="width=device-width, initial-scale=1.0">';
    sub_filter_once on;

    # Anonymous reads; auth required for writes.
    limit_except GET HEAD OPTIONS {
        auth_basic "Sandrone";
        auth_basic_user_file /etc/nginx/webdav.htpasswd;
    }
}
```

Browser sign-in uses Basic Auth and stores the generated `Authorization` header
in session storage, or local storage when "remember me" is enabled. Serve
untrusted user HTML/JS from a separate origin, or force downloads/sandboxing with
strict response headers, so same-origin files cannot read those credentials.

### Anubis integration

Too hard, you should figure out yourself, but TL;DR follow the Anubis setup guide and add WebDAV methods to bypass Anubis and go directly to the backend server.

## License

[MIT](./LICENSE)
