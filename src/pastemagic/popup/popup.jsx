import { useState, useEffect } from 'react';
import ReactDOM from "react-dom/client";
import {Textarea} from "@/components/ui/textarea.js";
import TimeTool from "@/pastemagic/component/timetool.jsx"
import CroneTool from "@/pastemagic/component/cronetool.jsx"
import JsonTool from "@/pastemagic/component/jsonTool.jsx"
import EncodeTool from "@/pastemagic/component/encodetool.jsx"
import UrlTool from "@/pastemagic/component/urltool.jsx"
import IpTool from "@/pastemagic/component/iptool.jsx"
import DnsTool from "@/pastemagic/component/dnstool.jsx"

// 格式检测函数
const detectContentType = (content) => {
    const trimmedContent = content?.trim() || '';
    
    // 检测IPv4地址格式
    const ipv4Pattern = /^((25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
    if (ipv4Pattern.test(trimmedContent)) {
        return 'ip';
    }
    
    // 检测IPv6地址格式（更严格的检测）
    // 要求必须包含至少一个冒号，且不能是纯数字
    if (trimmedContent.includes(':') && !/^[\d\.]+$/.test(trimmedContent)) {
        const ipv6FullRegex = /^([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/;
        const ipv6CompressedRegex = /^(([0-9a-fA-F]{1,4}:){1,7}:|:(([0-9a-fA-F]{1,4}:){1,7}|:)|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:))$/;
        if (ipv6FullRegex.test(trimmedContent) || ipv6CompressedRegex.test(trimmedContent)) {
            return 'ipv6';
        }
    }
    
    // 检测IPv4 CIDR格式 (如 192.168.1.0/24) - 要求必须包含斜杠
    if (trimmedContent.includes('/')) {
        const cidrPattern = /^((25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\/([1-9]|[12][0-9]|3[0-2])$/;
        if (cidrPattern.test(trimmedContent)) {
            return 'cidr';
        }
    }
    
    // 检测IPv6 CIDR格式 (如 2001:db8::/32) - 要求必须包含冒号和斜杠
    if (trimmedContent.includes(':') && trimmedContent.includes('/')) {
        const ipv6CidrPattern = /^([0-9a-fA-F]{1,4}(:[0-9a-fA-F]{1,4}){0,7}|:|::)(\/(1[0-2][0-8]|[1-9][0-9]|[0-9]))$/;
        if (ipv6CidrPattern.test(trimmedContent)) {
            return 'ipv6cidr';
        }
    }
    
    // 检测Cron表达式格式
    // 支持标准5字段: 0 0 * * *
    // 支持6字段(含秒): 0 0 0 * * *
    // 支持Quartz格式(含年份): 0 0 0 * * ? 2024
    const cronPatterns = [
        /^([\d\*\/,\-\?]+\s+){4}[\d\*\/,\-\?]+$/,  // 5字段标准格式
        /^([\d\*\/,\-\?]+\s+){5}[\d\*\/,\-\?]+$/,  // 6字段格式(含秒)
        /^([\d\*\/,\-\?]+\s+){6}[\d\*\/,\-\?]+$/   // 7字段格式(含秒和年份)
    ];
    
    if (cronPatterns.some(pattern => pattern.test(trimmedContent))) {
        return 'cron';
    }
    
    // 检测时间戳格式 (10位或13位数字)
    const timestampPattern = /^\d{10}$|^\d{13}$/;
    if (timestampPattern.test(trimmedContent)) {
        return 'timestamp';
    }
    
    // 检测日期时间格式 (YYYY-MM-DD HH:mm:ss 或类似格式)
    const dateTimePattern = /^\d{4}-\d{2}-\d{2}(\s+\d{2}:\d{2}:\d{2})?$/;
    if (dateTimePattern.test(trimmedContent)) {
        return 'datetime';
    }
    
    // 检测JSON格式 - 支持不完整的JSON片段
    // 排除纯数字的情况
    const numberPattern = /^\d+$/;
    if (numberPattern.test(trimmedContent)) {
        // 纯数字不认为是JSON
    } else {
        // 检查是否包含明显的JSON特征
        const jsonIndicators = [
            /^\s*\{/,           // 以 { 开头
            /\}\s*$/,           // 以 } 结尾
            /"[^"]*":/,        // 包含键值对格式
            /\[\s*\]/,         // 空数组
            /\{\s*\}/          // 空对象
        ];
        
        const hasJsonIndicators = jsonIndicators.some(pattern => pattern.test(trimmedContent));
        
        if (hasJsonIndicators) {
            // 尝试严格解析
            try {
                JSON.parse(trimmedContent);
                return 'json';
            } catch (e) {
                // 严格解析失败，但包含JSON特征，仍然标记为json让JsonTool处理
                // JsonTool组件会负责显示错误信息和修复建议
                return 'json';
            }
        }
    }
    
    // 完全不是JSON格式
    try {
        JSON.parse(trimmedContent);
        return 'json';
    } catch (e) {
        // 不是有效JSON
    }
    
    // 检测URL格式 - http开头就认为是URL
    if (trimmedContent.toLowerCase().startsWith('http')) {
        return 'url';
    }
    
    // 检测URL编码特征 (%xx 格式)并验证解码后是否包含http
    const urlEncodedPattern = /%[0-9A-Fa-f]{2}/;
    if (urlEncodedPattern.test(trimmedContent)) {
        try {
            const decoded = decodeURIComponent(trimmedContent);
            if (decoded.toLowerCase().startsWith('http')) {
                return 'url';
            }
        } catch (e) {
            // 解码失败
        }
    }
    
    // 检测域名格式
    const domainPattern = /^[a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?)*\.[a-zA-Z]{2,}$/;
    if (domainPattern.test(trimmedContent)) {
        return 'domain';
    }
    
    // 默认返回encode (其他格式)
    return 'encode';
};



export default function PopUp() {
    const [content, setContent] = useState('');
    const contentType = detectContentType(content);

    // 根据内容类型渲染相应组件
    const renderToolComponent = () => {
        // 当内容为空时，显示默认本机IP
        if (!content || content.trim() === '') {
            return <IpTool content={content} showMyIp={true} />;
        }
        
        switch (contentType) {
            case 'ip':
            case 'ipv6':
            case 'cidr':
            case 'ipv6cidr':
                // 当输入IP时，同时展示本机IP和详细查询结果
                return <IpTool content={content} showMyIp={true} />;
            case 'domain':
                return <DnsTool content={content} />;
            case 'cron':
                return <CroneTool cronExpr={content} />;
            case 'timestamp':
            case 'datetime':
                return <TimeTool content={content} />;
            case 'json':
                return <JsonTool content={content} />;
            case 'url':
                return <UrlTool content={content} />;
            case 'encode':
            default:
                return <EncodeTool content={content} />;
        }
    };

    return (
        <div className="w-[400px] h-[600px] border rounded flex flex-col">
            <Textarea
                className='min-h-[100px]'
                placeholder="请输入内容...插件会根据内容智能进行解析"
                id="message-2"
                value={content}
                onChange={(e) => {
                   setContent(e.target.value)
                }}
            />
            
            {/* 显示当前检测到的内容类型 */}
            <div className="px-3 py-2 text-xs text-gray-500 bg-gray-50 border-b">
                检测到格式: {
                    !content || content.trim() === '' ? 
                    '默认IP' : 
                    {
                        'ip': 'IPv4地址',
                        'ipv6': 'IPv6地址',
                        'cidr': 'IPv4子网',
                        'ipv6cidr': 'IPv6子网',
                        'domain': '域名',
                        'cron': 'Cron表达式',
                        'timestamp': '时间戳',
                        'datetime': '日期时间',
                        'json': 'JSON',
                        'url': 'URL',
                        'encode': '编码格式'
                    }[contentType]
                }
            </div>

            {/* 动态渲染工具组件 */}
            <div className="flex-1 overflow-auto">
                {renderToolComponent()}
            </div>
        </div>
    );
}
const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<PopUp/>);