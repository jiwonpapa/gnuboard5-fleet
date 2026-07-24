#!/bin/sh
set -eu

root=$(CDPATH='' cd -- "$(dirname -- "$0")/../.." && pwd -P)
version=${1:-}
image_repository=${2:-ghcr.io/jiwonpapa/gnuboard5-fleet}
platform=${G5_FLEET_RELEASE_PLATFORM:-linux/amd64}

case "$version" in
  ""|*[!0-9A-Za-z._-]*) echo "usage: build_release.sh VERSION [IMAGE_REPOSITORY]" >&2; exit 1 ;;
esac
case "$platform" in
  linux/amd64|linux/arm64) ;;
  *) echo "unsupported release platform: $platform" >&2; exit 1 ;;
esac
for command in docker git python3; do
  command -v "$command" >/dev/null 2>&1 || {
    echo "required command missing: $command" >&2
    exit 1
  }
done
docker scout sbom --help >/dev/null

revision=$(git -C "$root" rev-parse HEAD)
test "$(git -C "$root" status --porcelain)" = ""
image="$image_repository:$version"
output="$root/dist/release/$version"
mkdir -p "$output"

docker buildx build \
  --platform "$platform" \
  --file "$root/Containerfile" \
  --build-arg "G5_FLEET_VERSION=$version" \
  --build-arg "G5_FLEET_REVISION=$revision" \
  --label "org.opencontainers.image.version=$version" \
  --label "org.opencontainers.image.revision=$revision" \
  --sbom=true \
  --provenance=mode=max \
  --load \
  --tag "$image" \
  "$root"

archive="$output/g5-fleet-$version.docker.tar"
sbom="$output/g5-fleet-$version.spdx.json"
connector_archive="$output/gnuboard5-fleet-connector-$version.tar.gz"
connector_sbom="$output/gnuboard5-fleet-connector-$version.cdx.json"
manifest="$output/release-manifest.json"
docker image save --output "$archive" "$image"
docker scout sbom "local://$image" --format spdx --output "$sbom"
python3 "$root/tools/package/build_connector_package.py" \
  --version "$version" \
  --output-dir "$output"
python3 "$root/tools/package/write_release_manifest.py" \
  --image "$image" \
  --platform "$platform" \
  --version "$version" \
  --revision "$revision" \
  --archive "$archive" \
  --sbom "$sbom" \
  --connector-archive "$connector_archive" \
  --connector-sbom "$connector_sbom" \
  --output "$manifest"
evidence="$root/.cache/evidence/package-release.json"
mkdir -p "$(dirname -- "$evidence")"
temporary_evidence="$evidence.tmp.$$"
cp "$manifest" "$temporary_evidence"
chmod 0600 "$temporary_evidence"
mv "$temporary_evidence" "$evidence"

echo "release package verified: $manifest platform=$platform"
