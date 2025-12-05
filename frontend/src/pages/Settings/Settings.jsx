import React, { useState } from 'react'
import { 
  Save, 
  User, 
  Building, 
  Bell, 
  Shield, 
  Globe,
  Palette,
  Printer,
  Mail,
  CreditCard,
  Database,
  Download,
  Upload
} from 'lucide-react'
import { Helmet } from 'react-helmet-async'
import { useForm } from 'react-hook-form'
import Card from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'
import Badge from '../../components/ui/Badge'
import Tabs from '../../components/ui/Tabs'
import toast from 'react-hot-toast'

const Settings = () => {
  const [activeTab, setActiveTab] = useState('profile')
  const [isSaving, setIsSaving] = useState(false)

  const { register, handleSubmit, formState: { errors } } = useForm()

  const tabs = [
    { id: 'profile', label: 'Perfil', icon: User },
    { id: 'company', label: 'Empresa', icon: Building },
    { id: 'notifications', label: 'Notificações', icon: Bell },
    { id: 'security', label: 'Segurança', icon: Shield },
    { id: 'appearance', label: 'Aparência', icon: Palette },
    { id: 'integrations', label: 'Integrações', icon: Globe },
    { id: 'backup', label: 'Backup', icon: Database }
  ]

  const onSubmit = async (data) => {
    setIsSaving(true)
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000))
      toast.success('Configurações salvas com sucesso!')
    } catch (error) {
      toast.error('Erro ao salvar configurações')
    } finally {
      setIsSaving(false)
    }
  }

  const handleExportData = () => {
    toast.success('Exportação iniciada')
  }

  const handleImportData = () => {
    toast.info('Funcionalidade de importação em desenvolvimento')
  }

  const renderTabContent = () => {
    switch (activeTab) {
      case 'profile':
        return (
          <div className="space-y-6">
            <div className="flex items-center gap-6">
              <div className="w-24 h-24 rounded-full bg-gray-100 flex items-center justify-center">
                <User className="h-12 w-12 text-gray-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold">Foto de Perfil</h3>
                <p className="text-gray-600 text-sm mt-1">
                  PNG, JPG até 5MB
                </p>
                <div className="flex gap-3 mt-3">
                  <Button variant="outline" size="sm">
                    Alterar
                  </Button>
                  <Button variant="ghost" size="sm">
                    Remover
                  </Button>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Input
                label="Nome Completo"
                placeholder="Seu nome"
                {...register('name', { required: 'Nome é obrigatório' })}
                error={errors.name?.message}
              />
              
              <Input
                label="E-mail"
                type="email"
                placeholder="seu@email.com"
                {...register('email', { 
                  required: 'E-mail é obrigatório',
                  pattern: {
                    value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                    message: 'E-mail inválido'
                  }
                })}
                error={errors.email?.message}
              />
              
              <Input
                label="Telefone"
                placeholder="(11) 99999-9999"
                {...register('phone')}
              />
              
              <Input
                label="Cargo"
                placeholder="Gerente, Administrador, etc."
                {...register('role')}
              />
            </div>

            <div className="border-t pt-6">
              <h3 className="text-lg font-semibold mb-4">Preferências</h3>
              <div className="space-y-4">
                <label className="flex items-center">
                  <input type="checkbox" className="rounded border-gray-300 text-primary focus:ring-primary" />
                  <span className="ml-2 text-gray-700">Receber notificações por e-mail</span>
                </label>
                <label className="flex items-center">
                  <input type="checkbox" className="rounded border-gray-300 text-primary focus:ring-primary" />
                  <span className="ml-2 text-gray-700">Modo escuro automático</span>
                </label>
                <label className="flex items-center">
                  <input type="checkbox" className="rounded border-gray-300 text-primary focus:ring-primary" />
                  <span className="ml-2 text-gray-700">Compactar dados automaticamente</span>
                </label>
              </div>
            </div>
          </div>
        )

      case 'company':
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Input
                label="Nome da Empresa"
                placeholder="Nome legal da empresa"
                {...register('companyName', { required: 'Nome da empresa é obrigatório' })}
                error={errors.companyName?.message}
              />
              
              <Input
                label="CNPJ"
                placeholder="00.000.000/0000-00"
                {...register('cnpj')}
              />
              
              <Input
                label="Telefone Comercial"
                placeholder="(11) 3333-4444"
                {...register('companyPhone')}
              />
              
              <Input
                label="E-mail Comercial"
                type="email"
                placeholder="contato@empresa.com"
                {...register('companyEmail')}
              />
              
              <Input
                label="Endereço"
                placeholder="Rua, Número"
                {...register('address')}
                className="md:col-span-2"
              />
              
              <Input
                label="Cidade"
                placeholder="Cidade"
                {...register('city')}
              />
              
              <Input
                label="Estado"
                placeholder="Estado"
                {...register('state')}
              />
            </div>

            <div className="border-t pt-6">
              <h3 className="text-lg font-semibold mb-4">Configurações Fiscais</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Input
                  label="Inscrição Estadual"
                  placeholder="ISENTO ou número"
                  {...register('stateRegistration')}
                />
                
                <Input
                  label="Inscrição Municipal"
                  placeholder="Opcional"
                  {...register('municipalRegistration')}
                />
                
                <Input
                  label="CNAE Principal"
                  placeholder="Código CNAE"
                  {...register('cnae')}
                />
                
                <Input
                  label="Regime Tributário"
                  placeholder="Simples Nacional, Lucro Presumido"
                  {...register('taxRegime')}
                />
              </div>
            </div>
          </div>
        )

      case 'notifications':
        return (
          <div className="space-y-6">
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Preferências de Notificação</h3>
              
              <Card>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium">Notificações por E-mail</h4>
                      <p className="text-sm text-gray-600">Receba notificações importantes por e-mail</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" className="sr-only peer" defaultChecked />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/50 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                    </label>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium">Alertas de Segurança</h4>
                      <p className="text-sm text-gray-600">Notificações sobre atividades suspeitas</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" className="sr-only peer" defaultChecked />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/50 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                    </label>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium">Notificações de Vendas</h4>
                      <p className="text-sm text-gray-600">Alertas sobre novas vendas e transações</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" className="sr-only peer" defaultChecked />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/50 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                    </label>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium">Alertas de Estoque</h4>
                      <p className="text-sm text-gray-600">Notificações quando produtos estão com estoque baixo</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" className="sr-only peer" defaultChecked />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/50 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                    </label>
                  </div>
                </div>
              </Card>
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Frequência de Notificações</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Relatórios Diários
                  </label>
                  <select className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary/50">
                    <option>8:00</option>
                    <option>12:00</option>
                    <option>18:00</option>
                  </select>
                </div>
                
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Relatórios Semanais
                  </label>
                  <select className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary/50">
                    <option>Segunda-feira</option>
                    <option>Sexta-feira</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        )

      case 'backup':
        return (
          <div className="space-y-6">
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Backup de Dados</h3>
              
              <Card>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium">Último Backup</h4>
                      <p className="text-sm text-gray-600">Hoje, 02:00</p>
                    </div>
                    <Badge variant="success">COMPLETO</Badge>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium">Próximo Backup</h4>
                      <p className="text-sm text-gray-600">Amanhã, 02:00</p>
                    </div>
                    <Badge variant="primary">AGENDADO</Badge>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium">Tamanho do Backup</h4>
                      <p className="text-sm text-gray-600">45.2 MB</p>
                    </div>
                    <Badge variant="info">COMPACTADO</Badge>
                  </div>
                </div>
              </Card>
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Ações</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Button
                  variant="outline"
                  icon={Download}
                  fullWidth
                  onClick={handleExportData}
                >
                  Exportar Dados
                </Button>
                
                <Button
                  variant="outline"
                  icon={Upload}
                  fullWidth
                  onClick={handleImportData}
                >
                  Importar Dados
                </Button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Button
                  variant="primary"
                  icon={Database}
                  fullWidth
                >
                  Backup Agora
                </Button>
                
                <Button
                  variant="danger"
                  icon={Trash2}
                  fullWidth
                >
                  Limpar Backups Antigos
                </Button>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Configurações de Backup</h3>
              
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Frequência de Backup
                  </label>
                  <select className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary/50">
                    <option>Diário</option>
                    <option>Semanal</option>
                    <option>Mensal</option>
                  </select>
                </div>
                
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Retenção de Backups
                  </label>
                  <select className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary/50">
                    <option>7 dias</option>
                    <option>30 dias</option>
                    <option>90 dias</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        )

      default:
        return (
          <div className="text-center py-12">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-100 rounded-full mb-4">
              {(() => {
                const Icon = tabs.find(t => t.id === activeTab)?.icon || Globe
                return <Icon className="h-8 w-8 text-gray-400" />
              })()}
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Configurações de {tabs.find(t => t.id === activeTab)?.label}
            </h3>
            <p className="text-gray-600">
              Esta seção está em desenvolvimento.
            </p>
          </div>
        )
    }
  }

  return (
    <>
      <Helmet>
        <title>Configurações - BizFlow</title>
      </Helmet>

      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Configurações</h1>
            <p className="text-gray-600 mt-1">
              Gerencie as configurações da sua conta e empresa
            </p>
          </div>
          
          <Button
            variant="primary"
            icon={Save}
            loading={isSaving}
            onClick={handleSubmit(onSubmit)}
          >
            Salvar Alterações
          </Button>
        </div>

        {/* Settings Layout */}
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Sidebar */}
          <div className="lg:w-64">
            <Card className="sticky top-6">
              <nav className="space-y-1">
                {tabs.map((tab) => {
                  const Icon = tab.icon
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`
                        flex items-center w-full px-4 py-3 text-left rounded-lg transition-colors
                        ${activeTab === tab.id
                          ? 'bg-primary/10 text-primary font-medium'
                          : 'text-gray-700 hover:bg-gray-100'
                        }
                      `}
                    >
                      <Icon className="h-5 w-5 mr-3" />
                      {tab.label}
                    </button>
                  )
                })}
              </nav>
            </Card>
          </div>

          {/* Main Content */}
          <div className="flex-1">
            <Card>
              <form onSubmit={handleSubmit(onSubmit)}>
                {renderTabContent()}
                
                <div className="flex justify-end space-x-3 mt-8 pt-6 border-t">
                  <Button type="button" variant="outline">
                    Cancelar
                  </Button>
                  <Button type="submit" variant="primary" loading={isSaving}>
                    Salvar Alterações
                  </Button>
                </div>
              </form>
            </Card>
          </div>
        </div>
      </div>
    </>
  )
}

export default Settings
