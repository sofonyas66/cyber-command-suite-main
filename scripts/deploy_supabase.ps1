param()

<#
  Simple PowerShell helper to apply Supabase migrations and deploy functions.
  Usage: `powershell -ExecutionPolicy Bypass -File .\scripts\deploy_supabase.ps1`
  Requires the `supabase` CLI to be installed and available in PATH.
#>

Set-StrictMode -Version Latest

# Load .env if present
$envFile = Join-Path (Get-Location) '.env'
if (Test-Path $envFile) {
  Get-Content $envFile | ForEach-Object {
    if ($_ -match '^[#;]' -or $_ -notmatch '=') { return }
    $parts = $_ -split '=', 2
    $k = $parts[0].Trim()
    $v = $parts[1].Trim()
    if (-not [string]::IsNullOrEmpty($k) -and -not $env:$k) { $env:$k = $v }
  }
}

if (-not $env:VITE_SUPABASE_URL) {
  Write-Error "VITE_SUPABASE_URL not set. Copy .env.example to .env and set VITE_SUPABASE_URL."
  exit 1
}

# Extract project ref from URL like https://<ref>.supabase.co
if ($env:VITE_SUPABASE_URL -match 'https?://([^\.]+)\.') {
  $projectRef = $matches[1]
} else {
  Write-Error "Could not parse project ref from VITE_SUPABASE_URL"
  exit 1
}

Write-Host "Using Supabase project ref: $projectRef"

if (-not (Get-Command supabase -ErrorAction SilentlyContinue)) {
  Write-Error "supabase CLI not found. Install from https://supabase.com/docs/guides/cli"
  exit 1
}

Write-Host "Applying migrations..."
try {
  supabase migrations apply --project-ref $projectRef
  Write-Host "Migrations applied via supabase migrations apply"
} catch {
  Write-Warning "`nsupabase migrations apply failed; attempting fallback to supabase db push"
  supabase db push --project-ref $projectRef
}

Write-Host "Deploying functions..."
Get-ChildItem -Path "supabase/functions" -Directory | ForEach-Object {
  $name = $_.Name
  Write-Host "Deploying function $name"
  supabase functions deploy $name --project-ref $projectRef
}

Write-Host "Done."
