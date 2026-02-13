import { CipherUtils } from './src/pastemagic/utils/cipherutils.js';
import NodeRSA from 'node-rsa';

// 生成RSA密钥对用于测试
const key = new NodeRSA({b: 1024});
const testPublicKey = key.exportKey('public');
const testPrivateKey = key.exportKey('private');

console.log('=== RSA 加密解密测试 ===');

// 测试数据
const testData = "Hello World! 这是一个RSA测试消息。";

try {
  console.log('原始数据:', testData);
  
  // RSA加密配置
  const rsaEncryptConfig = {
    "algorithm": "RSA",
    "publicKey": {
      "value": testPublicKey,
      "encoding": ["UTF8"]
    },
    "plainEncoding": ["UTF8"],
    "cipherEncoding": ["BASE64"]
  };
  
  // RSA加密
  const encrypted = CipherUtils.encrypt(testData, rsaEncryptConfig);
  console.log('RSA加密结果:', encrypted);
  
  // RSA解密配置
  const rsaDecryptConfig = {
    "algorithm": "RSA",
    "privateKey": {
      "value": testPrivateKey,
      "encoding": ["UTF8"]
    },
    "plainEncoding": ["UTF8"],
    "cipherEncoding": ["BASE64"]
  };
  
  // RSA解密
  const decrypted = CipherUtils.decrypt(encrypted, rsaDecryptConfig);
  console.log('RSA解密结果:', decrypted);
  
  // 验证
  console.log('验证成功:', testData === decrypted);
  
} catch (error) {
  console.error('RSA测试失败:', error.message);
  console.error(error.stack);
}