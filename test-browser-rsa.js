// 测试浏览器环境下的 RSA 加密解密功能
import { CipherUtils } from './src/pastemagic/utils/cipherutils.js';

console.log('=== 浏览器 RSA 加密解密测试 ===');

// 测试数据
const testData = "Hello World! 这是一个RSA测试消息。";

// 简单的 RSA 密钥对（用于测试）
const testPublicKey = `-----BEGIN PUBLIC KEY-----
MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQCqGKukO1De7zhZj6+H0qtjTkVxwTCpvKe4eCZ0
FPqri0cb2JZfXJ/DgYSF6vUpwmJG8wVQZKjeGcjDOL5UlsuusFncCzWBQ7RKNUSesmQRMSGkVb1/
3j+skZ6UtW+5u09lHNsj6tQ51s1SPrCBkedbNf0Tp0GbMJDyR4e9T04ZZwIDAQAB
-----END PUBLIC KEY-----`;

const testPrivateKey = `-----BEGIN PRIVATE KEY-----
MIICeAIBADANBgkqhkiG9w0BAQEFAASCAmIwggJeAgEAAoGBAKoYq6Q7UN7vOFmPr4fSq2NORXHB
MKm8p7h4JnQU+quLRxvYll9cn8OBhIXq9SnCYkbzBVBkqN4ZyMM4vlSWy66wWdwLNYFDtEo1RJ6y
ZBExIaRVvX/eP6yRnpS1b7m7T2Uc2yPq1DnWzVI+sIGR51s1/ROnQZswkPJHh71PThlnAgMBAAEC
gYEA45gzQLi7hAfVhRictua2AlY9gfLZmwQ4WzcJaYisqMZDuBoA1KUmga8sHM7HHftzsdc+7Ulv
4nx4i3oAqxk7a13D7mB9E+z3H+w0ZupLxQuKjfV8V0vzEOMiOktTWmDdRF6XlQqpcdbt088Hnf7Y
33gH3ZcQ5WwDHQz1KufyDzECQQDQ3D95c3r+woW5aG/te0AhdRDGRovARLXt6MFeK9hCDsYQzHpU
8PoDm/oUg5OAFPCkp3ZxWRZFhZfx65d32mtFAkEAwHZPJA3OdXIrhK4bvJy5rR+hxWNn8jNhg0fT
0Q8jdz87aD8NFjJi17AgbS7WQP7wHn7sDRrNLwGC7fbsDyO1CQJBAJw1oObdyRxmRqbU6LLkoeUM
mGYwRHuC9k0HlWgF4WsiJHdk9v/gK1dXyGX6gtxJxaE0x3W4i9JlUVrkKZf3QUICQDFPJ988NBFs
XOUK5CvwkWh7UdRYvJ7X6FN9bGM7zjGHvlgLKEJuacwqVx1DkCEc3h76ZYIgDlJ81s4j0dECQQCs
pG7VqXge3NjhP8SzC2G2A202R07rjd8pWWrcwFk9JtJvW4mZESxQZlKTbF4A2FZ9F7G0jvJXJeqm
00ywl3J9
-----END PRIVATE KEY-----`;

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
  
  if (testData === decrypted) {
    console.log('✅ RSA 加密解密测试通过！');
  } else {
    console.log('❌ RSA 加密解密测试失败！');
  }
  
} catch (error) {
  console.error('RSA测试失败:', error.message);
  console.error(error.stack);
}