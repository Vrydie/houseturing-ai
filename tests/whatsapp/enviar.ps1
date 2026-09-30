param([Parameter(Mandatory=$true)][string]$Fixture,[string]$BadSignature)
# La implementación común lee OT05_ENV_FILE; nunca contiene secretos.
node "$PSScriptRoot/enviar.mjs" $Fixture $BadSignature
exit $LASTEXITCODE
