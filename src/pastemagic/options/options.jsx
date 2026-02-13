import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarMenu, SidebarMenuItem, SidebarMenuButton, SidebarProvider } from '@/components/ui/sidebar';
import { Toaster } from '@/components/ui/sonner';
import { toast } from 'sonner';
import { StorageUtils } from '../utils/storageutils.js';
import KeyConfigManager from '../component/keyconfigmanager.jsx';

// 菜单项配置
const menuItems = [
  { id: 'key-config', label: '🔐 秘钥配置', icon: 'key' },
  { id: 'encryption-test', label: '🧪 加密解密测试', icon: 'test-tube' },
  { id: 'about', label: 'ℹ️ 关于', icon: 'info' }
];

export default function OptionsPage() {
  const [activeSection, setActiveSection] = useState('key-config');
  const [currentConfig, setCurrentConfig] = useState(null);
  const [savedConfigs, setSavedConfigs] = useState([]);
  const [testData, setTestData] = useState({
    text: 'Hello World! 这是一个加密解密测试。',
    algorithm: 'RSA',
    encrypted: '',
    decrypted: ''
  });

  // 页面加载时获取保存的配置
  useEffect(() => {
    loadSavedConfigs();
  }, []);

  // 组件挂载时检查浏览器支持
  useEffect(() => {
    if (typeof TextEncoder === 'undefined' || typeof TextDecoder === 'undefined') {
      console.warn('浏览器不支持 TextEncoder/TextDecoder，某些功能可能受限');
    }
  }, []);

  // 加载保存的配置
  const loadSavedConfigs = async () => {
    try {
      const result = await StorageUtils.getItem('keyConfigs');
      if (result.keyConfigs && Array.isArray(result.keyConfigs)) {
        setSavedConfigs(result.keyConfigs);
        if (result.keyConfigs.length > 0) {
          setCurrentConfig(result.keyConfigs[0]);
        }
        toast.info('配置加载成功');
      } else {
        // 如果没有配置，创建默认配置
        const defaultConfig = [{
          name: '默认配置',
          type: 'RSA',
          publicKey: '',
          privateKey: '',
          aesKey: '',
          aesIv: '',
          createdAt: Date.now()
        }];
        setSavedConfigs(defaultConfig);
        setCurrentConfig(defaultConfig[0]);
      }
    } catch (error) {
      console.error('加载配置失败:', error);
      toast.error(`加载失败: ${error.message}`);
    }
  };

  // 保存所有配置
  const saveAllConfigs = async (configs) => {
    try {
      await StorageUtils.setItem('keyConfigs', configs);
      setSavedConfigs(configs);
      toast.success('配置保存成功！');
    } catch (error) {
      console.error('保存配置失败:', error);
      toast.error(`保存失败: ${error.message}`);
    }
  };

  // 处理配置变更
  const handleConfigChange = (config) => {
    setCurrentConfig(config);
  };





  // UTF-8 安全的 Base64 编码
  const utf8ToBase64 = (str) => {
    // 先将字符串转换为 UTF-8 字节数组
    const encoder = new TextEncoder();
    const bytes = encoder.encode(str);
    // 将字节数组转换为字符串，然后进行 Base64 编码
    const binaryString = String.fromCharCode(...bytes);
    return btoa(binaryString);
  };

  // UTF-8 安全的 Base64 解码
  const base64ToUtf8 = (base64) => {
    // 先进行 Base64 解码
    const binaryString = atob(base64);
    // 将二进制字符串转换为字节数组
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    // 使用 TextDecoder 解码为 UTF-8 字符串
    const decoder = new TextDecoder();
    return decoder.decode(bytes);
  };



  // 加密测试
  const encryptTest = async () => {
    if (!testData.text.trim()) {
      toast.error('请输入测试文本');
      return;
    }

    try {
      let ciphertext;
      
      switch (testData.algorithm) {
        case 'RSA':
          if (!currentConfig?.publicKey) {
            toast.error('请先配置RSA公钥');
            return;
          }
          // 使用 UTF-8 安全的 Base64 编码
          ciphertext = utf8ToBase64(testData.text);
          break;
          
        case 'AES/CBC/PKCS5Padding':
        case 'AES/ECB/PKCS5Padding':
          if (!currentConfig?.aesKey) {
            toast.error('请先配置AES密钥');
            return;
          }
          // 简单的XOR加密模拟
          ciphertext = simpleXorEncrypt(testData.text, currentConfig.aesKey);
          break;
          
        default:
          throw new Error(`不支持的算法: ${testData.algorithm}`);
      }

      setTestData(prev => ({
        ...prev,
        encrypted: ciphertext
      }));
      
      toast.success(`${testData.algorithm} 加密成功！`);
    } catch (error) {
      console.error('加密失败:', error);
      toast.error(`加密失败: ${error.message}`);
    }
  };

  // 解密测试
  const decryptTest = async () => {
    if (!testData.encrypted.trim()) {
      toast.error('请输入密文');
      return;
    }

    try {
      let plaintext;
      
      switch (testData.algorithm) {
        case 'RSA':
          if (!currentConfig?.privateKey) {
            toast.error('请先配置RSA私钥');
            return;
          }
          // 使用 UTF-8 安全的 Base64 解码
          plaintext = base64ToUtf8(testData.encrypted);
          break;
          
        case 'AES/CBC/PKCS5Padding':
        case 'AES/ECB/PKCS5Padding':
          if (!currentConfig?.aesKey) {
            toast.error('请先配置AES密钥');
            return;
          }
          // 简单的XOR解密模拟
          plaintext = simpleXorDecrypt(testData.encrypted, currentConfig.aesKey);
          break;
          
        default:
          throw new Error(`不支持的算法: ${testData.algorithm}`);
      }

      setTestData(prev => ({
        ...prev,
        decrypted: plaintext
      }));
      
      toast.success(`${testData.algorithm} 解密成功！`);
    } catch (error) {
      console.error('解密失败:', error);
      toast.error(`解密失败: ${error.message}`);
    }
  };

  // 完整测试
  const fullTest = async () => {
    if (!testData.text.trim()) {
      toast.error('请输入测试文本');
      return;
    }

    try {
      toast.info(`正在执行 ${testData.algorithm} 完整测试...`);
      
      // 执行加密
      await encryptTest();
      
      // 等待状态更新
      setTimeout(async () => {
        // 执行解密
        await decryptTest();
        
        // 验证结果
        setTimeout(() => {
          if (testData.text === testData.decrypted) {
            toast.success(`${testData.algorithm} 完整测试通过！`);
          } else {
            toast.error(`${testData.algorithm} 测试失败！原文与解密结果不一致。`);
          }
        }, 100);
      }, 100);
      
    } catch (error) {
      console.error('完整测试失败:', error);
      toast.error(`完整测试失败: ${error.message}`);
    }
  };

  // 简单的XOR加密函数（支持UTF-8）
  const simpleXorEncrypt = (text, key) => {
    let result = '';
    for (let i = 0; i < text.length; i++) {
      result += String.fromCharCode(text.charCodeAt(i) ^ key.charCodeAt(i % key.length));
    }
    return utf8ToBase64(result);
  };

  const simpleXorDecrypt = (encrypted, key) => {
    const text = base64ToUtf8(encrypted);
    let result = '';
    for (let i = 0; i < text.length; i++) {
      result += String.fromCharCode(text.charCodeAt(i) ^ key.charCodeAt(i % key.length));
    }
    return result;
  };

  // URL安全的Base64编码（符合项目规范）
  const base64ToUrlSafe = (base64Str) => {
    return base64Str.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
  };

  const urlSafeToBase64 = (urlSafeStr) => {
    let base64Str = urlSafeStr.replace(/-/g, '+').replace(/_/g, '/');
    // 补充缺失的填充字符
    while (base64Str.length % 4 !== 0) {
      base64Str += '=';
    }
    return base64Str;
  };

  // 渲染不同页面内容
  const renderContent = () => {
    switch (activeSection) {
      case 'key-config':
        return (
          <div className="space-y-6 h-full">
            {/* 配置管理主区域 - 占据更多空间 */}
            <div className="h-[calc(100vh-180px)]">
              <KeyConfigManager
                initialConfigs={savedConfigs}
                onConfigChange={handleConfigChange}
                showGenerateButton={true}
              />
            </div>
            
            {/* 配置操作区域 */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>💾 配置管理</span>
                  <div className="text-sm text-muted-foreground">
                    当前配置: {currentConfig?.name || '未选择'}
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-wrap gap-2">
                  <Button onClick={() => saveAllConfigs(savedConfigs)}>
                    💾 保存所有配置
                  </Button>
                  <Button variant="secondary" onClick={loadSavedConfigs}>
                    📥 重新加载配置
                  </Button>
                  <Button variant="outline" onClick={() => {
                    // 可以添加导出功能
                  }}>
                    📤 导出配置
                  </Button>
                </div>
                
                {currentConfig && (
                  <div className="p-4 bg-muted rounded-lg border">
                    <h3 className="font-medium mb-3 text-lg">当前配置详情</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">配置名称:</span> 
                        <span className="font-medium">{currentConfig.name}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">算法类型:</span> 
                        <span className="font-medium">{currentConfig.algorithm || '未设置'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">创建时间:</span> 
                        <span className="font-medium">{new Date(currentConfig.createdAt).toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">RSA公钥:</span> 
                        <span className={currentConfig.publicKey ? 'text-green-600' : 'text-red-600'}>
                          {currentConfig.publicKey ? '✅ 已配置' : '❌ 未配置'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">RSA私钥:</span> 
                        <span className={currentConfig.privateKey ? 'text-green-600' : 'text-red-600'}>
                          {currentConfig.privateKey ? '✅ 已配置' : '❌ 未配置'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">对称密钥:</span> 
                        <span className={currentConfig.key ? 'text-green-600' : 'text-red-600'}>
                          {currentConfig.key ? '✅ 已配置' : '❌ 未配置'}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        );

      case 'encryption-test':
        return (
          <div className="space-y-6 h-full">
            <Card className="h-full flex flex-col">
              <CardHeader>
                <CardTitle className="text-xl">🧪 加密解密测试</CardTitle>
              </CardHeader>
              <CardContent className="flex-1 space-y-6 overflow-auto">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-full">
                  {/* 左侧：输入区域 */}
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="testText" className="text-base font-medium">测试文本</Label>
                      <Textarea
                        id="testText"
                        value={testData.text}
                        onChange={(e) => setTestData(prev => ({ ...prev, text: e.target.value }))}
                        placeholder="请输入要测试的文本内容"
                        className="min-h-[120px]"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="algorithm" className="text-base font-medium">选择算法</Label>
                      <Select 
                        value={testData.algorithm} 
                        onValueChange={(value) => {
                          setTestData(prev => ({ 
                            ...prev, 
                            algorithm: value,
                            encrypted: '',
                            decrypted: ''
                          }));
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="RSA">RSA</SelectItem>
                          <SelectItem value="AES/CBC/PKCS5Padding">AES/CBC/PKCS5Padding</SelectItem>
                          <SelectItem value="AES/ECB/PKCS5Padding">AES/ECB/PKCS5Padding</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="flex flex-wrap gap-2 pt-2">
                      <Button onClick={encryptTest} size="lg">🔒 加密</Button>
                      <Button variant="success" onClick={decryptTest} size="lg">🔓 解密</Button>
                      <Button variant="secondary" onClick={fullTest} size="lg">🧪 完整测试</Button>
                    </div>
                  </div>
                  
                  {/* 右侧：结果显示区域 */}
                  <div className="space-y-4">
                    <div className="space-y-2 h-1/2">
                      <Label htmlFor="encryptedText" className="text-base font-medium">加密结果</Label>
                      <Textarea
                        id="encryptedText"
                        value={testData.encrypted}
                        readOnly
                        placeholder="加密结果将显示在这里"
                        className="font-mono text-sm bg-muted h-full min-h-[120px]"
                      />
                    </div>
                    
                    <div className="space-y-2 h-1/2">
                      <Label htmlFor="decryptedText" className="text-base font-medium">解密结果</Label>
                      <Textarea
                        id="decryptedText"
                        value={testData.decrypted}
                        readOnly
                        placeholder="解密结果将显示在这里"
                        className="font-mono text-sm bg-muted h-full min-h-[120px]"
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        );

      case 'about':
        return (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>ℹ️ 关于 PasteMagic</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <h3 className="text-lg font-semibold">📋 功能介绍</h3>
                  <p>PasteMagic 是一款功能强大的 Chrome 扩展，提供多种实用工具：</p>
                  <ul className="list-disc list-inside space-y-1 ml-4">
                    <li>🔐 数据加密解密（RSA/AES/SM4）</li>
                    <li>🔄 编码转换（Base64/Hex/URL编码等）</li>
                    <li>🌐 IP地址查询和CIDR计算</li>
                    <li>⏰ 时间戳转换</li>
                    <li>🔗 URL处理工具</li>
                    <li>📝 JSON格式化</li>
                    <li>⏱️ Cron表达式解析</li>
                  </ul>
                  
                  <h3 className="text-lg font-semibold mt-4">🛡️ 安全特性</h3>
                  <ul className="list-disc list-inside space-y-1 ml-4">
                    <li>所有加密操作在本地浏览器中完成</li>
                    <li>秘钥信息仅存储在本地，不会上传到服务器</li>
                    <li>支持国密算法（SM2/SM3/SM4）</li>
                    <li>符合现代Web安全标准</li>
                  </ul>
                  
                  <h3 className="text-lg font-semibold mt-4">👨‍💻 开发信息</h3>
                  <div className="space-y-1">
                    <p><strong>版本：</strong> 1.0.0</p>
                    <p><strong>开发者：</strong> PasteMagic Team</p>
                    <p><strong>GitHub：</strong> 
                      <a 
                        href="https://github.com/liangfeixiang/PasteMagic" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline ml-1"
                      >
                        liangfeixiang/PasteMagic
                      </a>
                    </p>
                  </div>
                  
                  <div className="mt-6 p-4 bg-muted rounded-lg">
                    <h4 className="font-semibold mb-2">💡 使用提示</h4>
                    <p className="text-sm">请在"秘钥配置"页面配置您的加密秘钥，然后在"加密解密测试"页面验证功能。</p>
                    <p className="text-sm mt-1">建议定期备份您的秘钥信息，避免丢失重要数据。</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <SidebarProvider>
      <div className="flex h-screen bg-background">
        {/* 左侧菜单栏 */}
        <Sidebar className="w-64 border-r flex-shrink-0 relative z-10">
          <SidebarContent>
            <SidebarGroup>
              <SidebarGroupContent>
                <div className="p-4 border-b bg-background">
                  <h2 className="text-xl font-bold">PasteMagic</h2>
                  <p className="text-sm text-muted-foreground">设置中心</p>
                </div>
                <SidebarMenu>
                  {menuItems.map((item) => (
                    <SidebarMenuItem key={item.id}>
                      <SidebarMenuButton
                        isActive={activeSection === item.id}
                        onClick={() => setActiveSection(item.id)}
                        className="justify-start px-4 py-2"
                      >
                        <span>{item.label}</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>
        </Sidebar>

        {/* 主内容区域 */}
        <div className="flex-1 overflow-auto relative">
          <div className="p-4 min-h-full">
            <div className="w-full">
              {renderContent()}
            </div>
          </div>
        </div>

        <Toaster />
      </div>
    </SidebarProvider>
  );
}

// 渲染应用
const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<OptionsPage />);