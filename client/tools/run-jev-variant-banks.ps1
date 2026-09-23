param(
  [int]$WaitForPid = 0,
  [string]$Url = 'http://127.0.0.1:4174'
)

$ErrorActionPreference = 'Stop'
$clientDir = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot '..')).Path
Set-Location -LiteralPath $clientDir
if (-not $env:TYPESAFE_API_KEY) { throw 'TYPESAFE_API_KEY is not set in this process.' }

if ($WaitForPid -gt 0) {
  Write-Output "Waiting for the active Normal recorder (PID $WaitForPid)."
  Wait-Process -Id $WaitForPid -ErrorAction SilentlyContinue
}

$profiles = @(
  @{ Name = 'normal'; Plan = 'tools/plans/jev-v1.json'; Out = 'tools/recordings/jev/fresh-normal-v1' },
  @{ Name = 'apex'; Plan = 'tools/plans/jev-apex-v1.json'; Out = 'tools/recordings/jev/fresh-apex-v1' },
  @{ Name = 'rival-hard'; Plan = 'tools/plans/jev-rival-hard-v1.json'; Out = 'tools/recordings/jev/fresh-rival-hard-v1' }
)
$failures = @()
foreach ($profile in $profiles) {
  $name = $profile.Name
  $log = "tools/recordings/jev/fresh-$name-batch.log"
  $complete = $false
  for ($pass = 1; $pass -le 3; $pass++) {
    & node tools/rivals-variant-progress.mjs --plan $profile.Plan --out $profile.Out
    if ($LASTEXITCODE -eq 0) { $complete = $true; break }
    & node -e "fetch(process.argv[1]).then(r => process.exit(r.ok ? 0 : 1), () => process.exit(1))" $Url
    if ($LASTEXITCODE -ne 0) { throw "Game server unavailable at $Url; restart it before resuming." }
    Write-Output "Recording $name, pass $pass. Log: $log"
    & node tools/rivals-record.mjs --plan $profile.Plan --jev --jevProfile $name `
      --jevMaxRequests 2000 --jevMaxInputTokens 4000000 --jevTimeoutMs 15000 `
      --url $Url --out $profile.Out --resume 2>&1 |
      Out-File -FilePath $log -Append -Encoding utf8
    if ($LASTEXITCODE -ne 0) { Write-Warning "$name recorder exited $LASTEXITCODE" }
  }
  & node tools/rivals-variant-progress.mjs --plan $profile.Plan --out $profile.Out
  if ($LASTEXITCODE -ne 0) {
    $failures += "${name}: some planned jobs are incomplete; bank was not replaced"
    continue
  }
  Write-Output "All 2,688 $name races are captured. Assembling fresh bank."
  & node tools/rivals-assemble-jev.mjs --profile $name --in $profile.Out --fresh --require 2688 `
    2>&1 | Out-File -FilePath "tools/recordings/jev/fresh-$name-assembly.log" -Encoding utf8
  if ($LASTEXITCODE -ne 0) { $failures += "${name}: bank assembly failed; inspect assembly log" }
}

if ($failures.Count) {
  $failures | ForEach-Object { Write-Warning $_ }
  exit 1
}
Write-Output 'All three fresh Jev banks were assembled.'
