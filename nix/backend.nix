{ stdenv, nodejs_22, pnpm, pnpmConfigHook, fetchPnpmDeps }:

let
  backendSrc = ../backend;

  backendDeps = fetchPnpmDeps {
    pname = "gorilla-blackout-backend";
    version = "0.1.0";
    src = backendSrc;
    fetcherVersion = 2;
    hash = "sha256-PyblZKa/n3k9CY64oQ0OdQ/eJfIYREKiIhu2kKnwshw=";
  };

in stdenv.mkDerivation {
  pname = "gorilla-blackout-backend";
  version = "0.1.0";
  src = backendSrc;

  pnpmDeps = backendDeps;

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

  # Dereference all pnpm virtual-store symlinks so the output is fully
  # self-contained inside $out and doesn't rely on Nix store paths at
  # container runtime.
  installPhase = ''
    runHook preInstall
    mkdir -p $out
    cp -rL node_modules $out/node_modules
    cp -r dist         $out/dist
    cp    package.json $out/package.json
    runHook postInstall
  '';
}
