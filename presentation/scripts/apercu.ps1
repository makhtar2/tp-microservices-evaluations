# Exporte chaque slide du support en PNG (dossier apercu/) via PowerPoint,
# pour relire le rendu sans ouvrir le fichier. Usage :
#   powershell -File scripts/apercu.ps1
$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
$pptx = Join-Path $root "Soutenance-Plateforme-Evaluations.pptx"
$out = Join-Path $root "apercu"

if (Test-Path $out) { Remove-Item -Recurse -Force $out }
New-Item -ItemType Directory -Force $out | Out-Null

$app = New-Object -ComObject PowerPoint.Application
try {
  # Open(FileName, ReadOnly, Untitled, WithWindow) : valeurs MsoTriState (-1 = vrai)
  $presentation = $app.Presentations.Open($pptx, -1, 0, 0)
  foreach ($slide in $presentation.Slides) {
    $file = Join-Path $out ("slide-{0:D2}.png" -f $slide.SlideIndex)
    $slide.Export($file, "PNG", 1600, 900)
  }
  $count = $presentation.Slides.Count
  $presentation.Close()
  Write-Output "$count slides exportées dans $out"
} finally {
  $app.Quit()
}
