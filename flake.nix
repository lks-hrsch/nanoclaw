{
  description = "NanoClaw development flakes (NixOS devShell)";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-25.11";
    flake-utils.url = "github:numtide/flake-utils";
  };

  outputs =
    {
      self,
      nixpkgs,
      flake-utils,
      ...
    }:
    flake-utils.lib.eachDefaultSystem (
      system:
      let
        pkgs = import nixpkgs {
          inherit system;
          config = {
            allowUnfree = true;
          };
        };
      in
      {
        devShells.default = pkgs.mkShell {
          name = "nanoclaw-dev-shell";

          buildInputs = [
            pkgs.nodejs
            pkgs.pnpm
            pkgs.git
            pkgs.python3
            pkgs."pkg-config"
            pkgs.sqlite
            pkgs.openssl
            pkgs.zlib
            pkgs.gnumake
            pkgs.gcc
          ];

          shellHook = ''
            echo "Entering NanoClaw dev shell for ${system}"
            if [ ! -d node_modules ]; then
              if command -v pnpm >/dev/null 2>&1; then
                echo "Installing Node dependencies with pnpm..."
                pnpm install --frozen-lockfile || pnpm install
              else
                echo "pnpm not found; run 'pnpm install' manually."
              fi
            fi
          '';
        };
      }
    );
}
