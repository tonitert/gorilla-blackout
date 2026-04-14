{
  description = "Gorilla Blackout - web and backend container images";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    flake-utils.url = "github:numtide/flake-utils";
  };

  outputs = { self, nixpkgs, flake-utils }:
    flake-utils.lib.eachDefaultSystem (system:
      let
        pkgs = nixpkgs.legacyPackages.${system};

        backend = pkgs.callPackage ./nix/backend.nix {};
        webOut  = pkgs.callPackage ./nix/web.nix {};
        inherit (webOut) web nginxConf;

      in {
        devShells.default = pkgs.mkShell {
          packages = [
            pkgs.nodejs_22
            pkgs.pnpm
          ];
        };

        packages = {
          # docker load < $(nix build .#backend-image --print-out-paths)
          backend-image = pkgs.dockerTools.buildLayeredImage {
            name = "gorilla-blackout-backend";
            tag = "latest";

            contents = [
              pkgs.nodejs_22
              pkgs.coreutils
            ];

            extraCommands = ''
              mkdir -p app
              cp -r ${backend}/dist         app/dist
              cp    ${backend}/package.json app/package.json
              cp -rL ${backend}/node_modules app/node_modules
            '';

            config = {
              WorkingDir   = "/app";
              Cmd          = [ "${pkgs.nodejs_22}/bin/node" "dist/index.js" ];
              ExposedPorts = { "3001/tcp" = {}; };
            };
          };

          # docker load < $(nix build .#web-image --print-out-paths)
          web-image = pkgs.dockerTools.buildLayeredImage {
            name = "gorilla-blackout-web";
            tag = "latest";

            contents = [
              pkgs.nginx
              pkgs.fakeNss   # minimal /etc/passwd so nginx can drop to nobody
            ];

            extraCommands = ''
              # Static files
              mkdir -p www
              cp -r ${web}/. www/

              # nginx config
              mkdir -p etc/nginx
              cp ${nginxConf} etc/nginx/nginx.conf

              # Runtime directories nginx needs to write to
              mkdir -p var/log/nginx
              mkdir -p var/cache/nginx/client_body_temp
              mkdir -p tmp
            '';

            config = {
              Cmd          = [ "${pkgs.nginx}/bin/nginx" "-g" "daemon off;" ];
              ExposedPorts = { "80/tcp" = {}; };
            };
          };
        };
      }
    );
}
