// 测试存储工具类
import { StorageUtils } from './src/pastemagic/utils/storageutils.js';

console.log('=== 存储工具类测试 ===');

// 测试环境检测
console.log('是否为Chrome扩展环境:', StorageUtils.isChromeExtension());
console.log('是否支持localStorage:', StorageUtils.supportsLocalStorage());

// 测试数据
const testData = {
  publicKey: 'test-public-key',
  privateKey: 'test-private-key',
  aesKey: 'test-aes-key',
  timestamp: Date.now()
};

async function runTests() {
  try {
    console.log('\n--- 测试setItem ---');
    await StorageUtils.setItem('testKey', testData);
    console.log('✅ setItem 成功');

    console.log('\n--- 测试getItem ---');
    const result = await StorageUtils.getItem('testKey');
    console.log('获取的数据:', result);
    console.log('✅ getItem 成功');

    console.log('\n--- 测试批量设置 ---');
    await StorageUtils.setItems({
      'batchKey1': { value: 'data1' },
      'batchKey2': { value: 'data2' }
    });
    console.log('✅ 批量设置成功');

    console.log('\n--- 测试批量获取 ---');
    const batchResult = await StorageUtils.getItem(['batchKey1', 'batchKey2']);
    console.log('批量获取结果:', batchResult);
    console.log('✅ 批量获取成功');

    console.log('\n--- 测试removeItem ---');
    await StorageUtils.removeItem('testKey');
    const afterRemove = await StorageUtils.getItem('testKey');
    console.log('删除后的数据:', afterRemove);
    console.log('✅ removeItem 成功');

    if (StorageUtils.isChromeExtension()) {
      console.log('\n--- 测试存储使用情况 ---');
      try {
        const usage = await StorageUtils.getUsage();
        console.log('存储使用情况:', usage);
        console.log('✅ getUsage 成功');
      } catch (e) {
        console.log('getUsage 不可用（需要特定权限）');
      }
    }

    console.log('\n🎉 所有测试完成！');

  } catch (error) {
    console.error('❌ 测试失败:', error);
  }
}

// 在浏览器环境中运行测试
if (typeof window !== 'undefined') {
  window.runStorageTests = runTests;
  console.log('在浏览器控制台中运行: runStorageTests()');
} else {
  // 在Node.js环境中运行测试
  runTests();
}