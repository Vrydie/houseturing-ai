param (
    [Parameter(Mandatory=$true)][string]$Fixture,
    [string]$BadSignature
)

# R8: No re-serializar JSON, leer bytes puros
$PayloadBytes = [System.IO.File]::ReadAllBytes((Resolve-Path $Fixture).Path)
$Secret = "secret_local_test_12345"

if ($BadSignature -eq "--firma-mala") {
    $Signature = "sha256=firma_invalida_123"
} else {
    $hmac = New-Object System.Security.Cryptography.HMACSHA256
    $hmac.Key = [System.Text.Encoding]::UTF8.GetBytes($Secret)
    $hash = $hmac.ComputeHash($PayloadBytes)
    $hashString = [System.BitConverter]::ToString($hash).Replace("-", "").ToLower()
    $Signature = "sha256=$hashString"
}

Write-Host "Enviando $Fixture a http://127.0.0.1:5690/webhook/whatsapp"
$Headers = @{
    "Content-Type" = "application/json"
    "X-Hub-Signature-256" = $Signature
}

try {
    # Send the raw bytes to avoid PowerShell 5.1 encoding issues with application/json
    $response = Invoke-RestMethod -Method Post -Uri "http://127.0.0.1:5690/webhook/whatsapp" -Headers $Headers -Body $PayloadBytes
    $response | ConvertTo-Json
} catch {
    Write-Host "Error: $($_.Exception.Message)"
}
Write-Host "`nHecho."
