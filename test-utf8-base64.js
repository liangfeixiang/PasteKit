// 测试 UTF-8 Base64 编码功能
console.log('=== UTF-8 Base64 编码测试 ===');

// UTF-8 安全的 Base64 编码函数
const utf8ToBase64 = (str) => {
    // 先将字符串转换为 UTF-8 字节数组
    const encoder = new TextEncoder();
    const bytes = encoder.encode(str);
    // 将字节数组转换为字符串，然后进行 Base64 编码
    const binaryString = String.fromCharCode(...bytes);
    return btoa(binaryString);
};

// UTF-8 安全的 Base64 解码函数
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

// 测试数据
const testCases = [
    'Hello World!',
    '你好世界！',
    'Hello 世界! 🌍',
    '测试数据 Test Data',
    'Mixed混合内容123!@#',
    '🚀 Special chars: áéíóú ñ ç'
];

console.log('开始测试...\n');

testCases.forEach((testData, index) => {
    console.log(`测试 ${index + 1}: "${testData}"`);
    
    try {
        // 测试标准 Base64 编码
        const encoded = utf8ToBase64(testData);
        console.log(`  编码结果: ${encoded}`);
        
        // 测试解码
        const decoded = base64ToUtf8(encoded);
        console.log(`  解码结果: "${decoded}"`);
        
        // 验证一致性
        const isMatch = testData === decoded;
        console.log(`  一致性验证: ${isMatch ? '✅ 通过' : '❌ 失败'}`);
        
        // 测试 URL 安全编码
        const urlSafe = base64ToUrlSafe(encoded);
        console.log(`  URL安全编码: ${urlSafe}`);
        
        // 测试 URL 安全解码
        const restored = urlSafeToBase64(urlSafe);
        const finalDecoded = base64ToUtf8(restored);
        const urlSafeMatch = testData === finalDecoded;
        console.log(`  URL安全解码验证: ${urlSafeMatch ? '✅ 通过' : '❌ 失败'}`);
        
        console.log('');
        
    } catch (error) {
        console.error(`  ❌ 测试失败: ${error.message}`);
        console.log('');
    }
});

// 性能测试
console.log('=== 性能测试 ===');
const performanceTest = '这是一个较长的测试字符串，包含中文、英文和特殊符号！This is a longer test string with Chinese, English and special characters! 🚀🌟💻';

console.time('编码耗时');
const perfEncoded = utf8ToBase64(performanceTest);
console.timeEnd('编码耗时');

console.time('解码耗时');
const perfDecoded = base64ToUtf8(perfEncoded);
console.timeEnd('解码耗时');

console.log(`原始长度: ${performanceTest.length} 字符`);
console.log(`编码长度: ${perfEncoded.length} 字符`);
console.log(`解码正确: ${performanceTest === perfDecoded ? '✅' : '❌'}`);

console.log('\n🎉 测试完成！');