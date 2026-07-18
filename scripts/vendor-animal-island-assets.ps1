$ErrorActionPreference = 'Stop'

$SourceCommit = '1d61a384ca395552afe34930aef78549374d9f9e'
$BaseUrl = "https://raw.githubusercontent.com/guokaigdg/animal-island-ui/$SourceCommit/src/assets"
$Destination = Join-Path $PSScriptRoot '..\public\island\assets'
$Assets = @(
  'fonts/nunito-latin-500-normal.woff2',
  'fonts/nunito-latin-700-normal.woff2',
  'fonts/nunito-latin-900-normal.woff2',
  'fonts/noto-sans-sc-latin-400-normal.woff2',
  'fonts/noto-sans-sc-latin-500-normal.woff2',
  'fonts/noto-sans-sc-latin-700-normal.woff2',
  'fonts/noto-sans-sc-chinese-simplified-400-normal.woff2',
  'fonts/noto-sans-sc-chinese-simplified-500-normal.woff2',
  'fonts/noto-sans-sc-chinese-simplified-700-normal.woff2',
  'img/icons/icon-leaf.png',
  'img/icons/icon-shopping.svg',
  'img/icons/icon-camera.svg',
  'img/icons/icon-map.svg',
  'img/icons/icon-miles.svg',
  'img/icons/icon-design.svg',
  'img/icons/icon-diy.svg',
  'img/icons/icon-variant.svg',
  'img/dividers/divider-line-brown.svg',
  'img/dividers/divider-line-teal.svg',
  'img/dividers/divider-line-yellow.svg',
  'img/dividers/wave-yellow.svg',
  'img/footer/footer-sea.svg',
  'img/footer/footer-tree.webp'
)

foreach ($asset in $Assets) {
  $relative = $asset -replace '^img/', ''
  $output = Join-Path $Destination ($relative -replace '/', '\')
  New-Item -ItemType Directory -Force -Path (Split-Path $output) | Out-Null
  Invoke-WebRequest -UseBasicParsing "$BaseUrl/$asset" -OutFile $output
  if ((Get-Item -LiteralPath $output).Length -eq 0) {
    throw "Downloaded an empty asset: $asset"
  }
  Write-Output $relative
}
