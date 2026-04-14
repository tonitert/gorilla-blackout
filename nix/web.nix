{ stdenv, nodejs_22, pnpm, pnpmConfigHook, fetchPnpmDeps, nginx, writeText }:

let
  webSrc = ../.;

  webDeps = fetchPnpmDeps {
    pname = "gorilla-blackout-web";
    version = "0.0.1";
    src = webSrc;
    fetcherVersion = 2;
    hash = "sha256-kAmzAzvrxpg0JVqxOUWA7/1fx+LLJnaLZA7DM2BZn0Y=";
  };

  web = stdenv.mkDerivation {
    pname = "gorilla-blackout-web";
    version = "0.0.1";
    src = webSrc;

    pnpmDeps = webDeps;

    nativeBuildInputs = [
      nodejs_22
      pnpm
      pnpmConfigHook
    ];

    buildPhase = ''
      runHook preBuild
      pnpm build
      runHook postBuild
    '';

    installPhase = ''
      runHook preInstall
      cp -r build $out
      runHook postInstall
    '';
  };

  nginxConf = writeText "nginx.conf" ''
    events {}

    http {
      include       ${nginx}/conf/mime.types;
      default_type  application/octet-stream;
      sendfile      on;

      gzip on;
      gzip_types text/plain text/css application/json
                 application/javascript text/javascript
                 image/svg+xml;

      server {
        listen 80;
        root  /www;

        location / {
          try_files $uri $uri/ /index.html;
        }

        # Cache static assets aggressively
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff2?)$ {
          expires 1y;
          add_header Cache-Control "public, immutable";
        }
      }
    }
  '';

in { inherit web nginxConf; }
