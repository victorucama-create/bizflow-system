import React, { useState, useEffect } from 'react'
import { 
  QrCode, 
  Smartphone, 
  Key, 
  CheckCircle,
  X,
  Copy,
  RefreshCw
} from 'lucide-react'
import Card from '../../../components/ui/Card'
import Button from '../../../components/ui/Button'
import Input from '../../../components/ui/Input'
import Badge from '../../../components/ui/Badge'
import toast from 'react-hot-toast'

const TwoFactorSetup = ({ onVerify, onCancel }) => {
  const [verificationCode, setVerificationCode] = useState('')
  const [step, setStep] = useState(1)
  const [backupCodes, setBackupCodes] = useState([])
  const [timeLeft, setTimeLeft] = useState(30)
  const [isCodeValid, setIsCodeValid] = useState(true)

  // Generate mock backup codes
  useEffect(() => {
    const codes = Array.from({ length: 8 }, () => 
      Math.random().toString(36).substr(2, 6).toUpperCase()
    )
    setBackupCodes(codes)
  }, [])

  // Countdown timer for QR code
  useEffect(() => {
    if (step === 1 && timeLeft > 0) {
      const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000)
      return () => clearTimeout(timer)
    }
  }, [step, timeLeft])

  const handleCodeChange = (value) => {
    setVerificationCode(value)
    // Auto-submit when 6 digits are entered
    if (value.length === 6) {
      handleVerify()
    }
  }

  const handleVerify = () => {
    if (verificationCode.length !== 6) {
      setIsCodeValid(false)
      toast.error('Código deve ter 6 dígitos')
      return
    }

    // Mock validation - in production, this would call the API
    const isValid = /^\d{6}$/.test(verificationCode)
    setIsCodeValid(isValid)

    if (isValid) {
      setStep(2)
      toast.success('Código verificado com sucesso!')
    } else {
      toast.error('Código inválido. Tente novamente.')
    }
  }

  const handleCopyBackupCodes = () => {
    const codesText = backupCodes.join('\n')
    navigator.clipboard.writeText(codesText)
    toast.success('Códigos copiados para a área de transferência!')
  }

  const handleDownloadBackupCodes = () => {
    const codesText = backupCodes.join('\n')
    const blob = new Blob([codesText], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'bizflow-2fa-backup-codes.txt'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const handleFinishSetup = () => {
    onVerify(verificationCode)
  }

  const handleRegenerateCodes = () => {
    const newCodes = Array.from({ length: 8 }, () => 
      Math.random().toString(36).substr(2, 6).toUpperCase()
    )
    setBackupCodes(newCodes)
    toast.success('Novos códigos gerados!')
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <QrCode className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                Configurar Autenticação de Dois Fatores
              </h2>
              <p className="text-gray-600">Etapa {step} de 2</p>
            </div>
          </div>
          <button
            onClick={onCancel}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        {step === 1 ? (
          /* Step 1: Setup */
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* QR Code Section */}
              <div className="space-y-4">
                <div className="text-center">
                  <h3 className="font-medium text-gray-900 mb-2">1. Escaneie o Código QR</h3>
                  <div className="bg-gray-100 p-6 rounded-lg inline-block">
                    {/* Mock QR Code */}
                    <div className="w-48 h-48 bg-white rounded flex items-center justify-center">
                      <div className="text-center">
                        <QrCode className="h-16 w-16 text-gray-400 mx-auto mb-2" />
                        <p className="text-xs text-gray-500">Código QR de exemplo</p>
                      </div>
                    </div>
                  </div>
                  <p className="text-sm text-gray-500 mt-3">
                    Use um aplicativo autenticador como Google Authenticator ou Authy
                  </p>
                </div>

                {/* Manual Entry */}
                <div className="space-y-2">
                  <h4 className="font-medium text-gray-900">Ou insira manualmente:</h4>
                  <div className="bg-gray-50 p-3 rounded font-mono text-sm">
                    JBSWY3DPEHPK3PXP
                  </div>
                  <button className="text-sm text-primary hover:text-primary/80 flex items-center gap-1">
                    <Copy className="h-3 w-3" />
                    Copiar código
                  </button>
                </div>
              </div>

              {/* Instructions */}
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-blue-100 rounded">
                    <Smartphone className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-900">2. Instale um Aplicativo Autenticador</h3>
                    <p className="text-sm text-gray-600 mt-1">
                      Baixe e instale Google Authenticator (Android/iOS) ou Authy no seu dispositivo.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="p-2 bg-green-100 rounded">
                    <QrCode className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-900">3. Escaneie o Código QR</h3>
                    <p className="text-sm text-gray-600 mt-1">
                      Abra o aplicativo e escaneie o código QR acima.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="p-2 bg-purple-100 rounded">
                    <Key className="h-5 w-5 text-purple-600" />
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-900">4. Insira o Código de Verificação</h3>
                    <p className="text-sm text-gray-600 mt-1">
                      Digite o código de 6 dígitos gerado pelo aplicativo.
                    </p>
                  </div>
                </div>

                {/* Countdown Timer */}
                <div className="bg-yellow-50 p-4 rounded-lg">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-yellow-800">
                      Código QR expira em:
                    </span>
                    <Badge variant="warning">
                      {timeLeft}s
                    </Badge>
                  </div>
                  {timeLeft < 10 && (
                    <p className="text-xs text-yellow-600 mt-2">
                      O código QR irá expirar em breve. Atualize a página para gerar um novo.
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Verification Code Input */}
            <div className="space-y-3">
              <label className="block text-sm font-medium text-gray-700">
                Código de Verificação
              </label>
              <Input
                placeholder="000000"
                value={verificationCode}
                onChange={(e) => handleCodeChange(e.target.value)}
                maxLength="6"
                className={`text-center text-2xl tracking-widest font-mono ${
                  !isCodeValid && verificationCode.length === 6
                    ? 'border-red-300 focus:ring-red-200'
                    : ''
                }`}
              />
              {!isCodeValid && verificationCode.length === 6 && (
                <p className="text-sm text-red-600">
                  Código inválido. Verifique e tente novamente.
                </p>
              )}
              <p className="text-sm text-gray-500">
                Digite o código de 6 dígitos do seu aplicativo autenticador
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-between pt-4 border-t">
              <Button variant="outline" onClick={onCancel}>
                Cancelar
              </Button>
              <Button
                variant="primary"
                onClick={handleVerify}
                disabled={verificationCode.length !== 6}
              >
                Verificar e Continuar
              </Button>
            </div>
          </div>
        ) : (
          /* Step 2: Backup Codes */
          <div className="space-y-6">
            {/* Success Message */}
            <div className="p-4 bg-green-50 rounded-lg">
              <div className="flex items-center gap-3">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <div>
                  <h3 className="font-medium text-green-900">
                    Autenticação de Dois Fatores Configurada!
                  </h3>
                  <p className="text-sm text-green-800 mt-1">
                    Sua conta agora está protegida com 2FA.
                  </p>
                </div>
              </div>
            </div>

            {/* Backup Codes Warning */}
            <div className="p-4 bg-yellow-50 rounded-lg">
              <h3 className="font-medium text-yellow-900 mb-2">
                ⚠️ Guarde seus códigos de backup
              </h3>
              <p className="text-sm text-yellow-800">
                Se você perder seu dispositivo, precisará desses códigos para acessar sua conta.
                Cada código só pode ser usado uma vez.
              </p>
            </div>

            {/* Backup Codes Display */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">
                  Seus Códigos de Backup
                </h3>
                <button
                  onClick={handleRegenerateCodes}
                  className="text-sm text-primary hover:text-primary/80 flex items-center gap-1"
                >
                  <RefreshCw className="h-3 w-3" />
                  Gerar novos
                </button>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {backupCodes.map((code, index) => (
                  <div
                    key={index}
                    className="bg-gray-50 p-4 text-center font-mono rounded-lg border"
                  >
                    {code}
                  </div>
                ))}
              </div>

              <div className="flex flex-wrap gap-3">
                <Button
                  variant="outline"
                  icon={Copy}
                  onClick={handleCopyBackupCodes}
                >
                  Copiar Códigos
                </Button>
                <Button
                  variant="outline"
                  icon={Download}
                  onClick={handleDownloadBackupCodes}
                >
                  Baixar Códigos
                </Button>
                <Button
                  variant="outline"
                  icon={Printer}
                  onClick={() => window.print()}
                >
                  Imprimir
                </Button>
              </div>
            </div>

            {/* Security Tips */}
            <div className="p-4 bg-blue-50 rounded-lg">
              <h3 className="font-medium text-blue-900 mb-2">
                📝 Dicas de Segurança
              </h3>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• Imprima ou salve os códigos em um local seguro</li>
                <li>• Não compartilhe seus códigos com ninguém</li>
                <li>• Cada código só pode ser usado uma vez</li>
                <li>• Você pode gerar novos códigos a qualquer momento</li>
              </ul>
            </div>

            {/* Final Actions */}
            <div className="flex justify-between pt-4 border-t">
              <Button variant="outline" onClick={() => setStep(1)}>
                Voltar
              </Button>
              <Button
                variant="primary"
                icon={CheckCircle}
                onClick={handleFinishSetup}
              >
                Concluir Configuração
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  )
}

export default TwoFactorSetup
