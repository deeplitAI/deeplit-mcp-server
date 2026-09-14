param(
    [Parameter(Position = 0)]
    [ValidateSet("set", "get", "remove", "status")]
    [string]$Action = "status"
)

$ErrorActionPreference = "Stop"
$credentialDirectory = Join-Path $env:LOCALAPPDATA "Deeplit"
$credentialPath = Join-Path $credentialDirectory "codex-api-key.dat"

function Assert-Windows {
    if ($env:OS -ne "Windows_NT") {
        throw "This local credential helper currently supports Windows only."
    }
}

function Read-StoredApiKey {
    Assert-Windows
    if (-not (Test-Path -LiteralPath $credentialPath)) {
        throw "No deeplit credential is stored. Run the helper with its absolute path: node /path/to/plugins/deeplit/scripts/deeplit-auth.mjs set"
    }

    $encryptedValue = Get-Content -Raw -LiteralPath $credentialPath
    $secureValue = ConvertTo-SecureString $encryptedValue
    $pointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secureValue)

    try {
        return [Runtime.InteropServices.Marshal]::PtrToStringBSTR($pointer)
    }
    finally {
        [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($pointer)
    }
}

function Save-ApiKey {
    Assert-Windows
    $secureValue = Read-Host "deeplit platform API key (dk_core_...)" -AsSecureString
    $pointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secureValue)

    try {
        $plainValue = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($pointer)
        if (-not $plainValue.StartsWith("dk_core_", [StringComparison]::Ordinal)) {
            throw "The API key must start with dk_core_."
        }
    }
    finally {
        [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($pointer)
    }

    New-Item -ItemType Directory -Force -Path $credentialDirectory | Out-Null
    ConvertFrom-SecureString $secureValue | Set-Content -LiteralPath $credentialPath -NoNewline
    Write-Output "deeplit credential stored for the current Windows user."
}

switch ($Action) {
    "set" {
        Save-ApiKey
    }
    "get" {
        $apiKey = Read-StoredApiKey
        @{ "X-API-Key" = $apiKey } | ConvertTo-Json -Compress
    }
    "remove" {
        if (Test-Path -LiteralPath $credentialPath) {
            Remove-Item -LiteralPath $credentialPath
        }
        Write-Output "deeplit credential removed."
    }
    "status" {
        if (Test-Path -LiteralPath $credentialPath) {
            Write-Output "deeplit credential is configured."
        }
        else {
            Write-Output "deeplit credential is not configured."
        }
    }
}
