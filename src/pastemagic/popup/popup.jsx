import { useState, useEffect } from 'react';
import ReactDOM from "react-dom/client";
import {Textarea} from "@/components/ui/textarea.js";
import { Github } from "lucide-react";
import TimeTool from "@/pastemagic/component/timetool.jsx"
import CroneTool from "@/pastemagic/component/cronetool.jsx"
import JsonTool from "@/pastemagic/component/jsonTool.jsx"
import EncodeTool from "@/pastemagic/component/encodetool.jsx"
import UrlTool from "@/pastemagic/component/urltool.jsx"
import IpTool from "@/pastemagic/component/iptool.jsx"
import DnsTool from "@/pastemagic/component/dnstool.jsx"

// Format detection function
const detectContentType = (content) => {
    const trimmedContent = content?.trim() || '';
    
    // Detect IPv4 address format
    const ipv4Pattern = /^((25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
    if (ipv4Pattern.test(trimmedContent)) {
        return 'ip';
    }
    
    // Detect IPv6 address format (more strict detection)
    // Must contain at least one colon and cannot be pure numbers
    if (trimmedContent.includes(':') && !/^[\d\.]+$/.test(trimmedContent)) {
        const ipv6FullRegex = /^([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/;
        const ipv6CompressedRegex = /^(([0-9a-fA-F]{1,4}:){1,7}:|:(([0-9a-fA-F]{1,4}:){1,7}|:)|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:))$/;
        if (ipv6FullRegex.test(trimmedContent) || ipv6CompressedRegex.test(trimmedContent)) {
            return 'ipv6';
        }
    }
    
    // Detect IPv4 CIDR format (e.g. 192.168.1.0/24) - Must contain slash
    if (trimmedContent.includes('/')) {
        const cidrPattern = /^((25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\/([1-9]|[12][0-9]|3[0-2])$/;
        if (cidrPattern.test(trimmedContent)) {
            return 'cidr';
        }
    }
    
    // Detect IPv6 CIDR format (e.g. 2001:db8::/32) - Must contain colon and slash
    if (trimmedContent.includes(':') && trimmedContent.includes('/')) {
        const ipv6CidrPattern = /^([0-9a-fA-F]{1,4}(:[0-9a-fA-F]{1,4}){0,7}|:|::)(\/(1[0-2][0-8]|[1-9][0-9]|[0-9]))$/;
        if (ipv6CidrPattern.test(trimmedContent)) {
            return 'ipv6cidr';
        }
    }
    
    // Detect Cron expression format
    // Support standard 5 fields: 0 0 * * *
    // Support 6 fields (with seconds): 0 0 0 * * *
    // Support Quartz format (with year): 0 0 0 * * ? 2024
    const cronPatterns = [
        /^([\d\*\/,\-\?]+\s+){4}[\d\*\/,\-\?]+$/,  // 5字段标准格式
        /^([\d\*\/,\-\?]+\s+){5}[\d\*\/,\-\?]+$/,  // 6字段格式(含秒)
        /^([\d\*\/,\-\?]+\s+){6}[\d\*\/,\-\?]+$/   // 7字段格式(含秒和年份)
    ];
    
    if (cronPatterns.some(pattern => pattern.test(trimmedContent))) {
        return 'cron';
    }
    
    // Detect timestamp format (10 or 13 digit numbers)
    const timestampPattern = /^\d{10}$|^\d{13}$/;
    if (timestampPattern.test(trimmedContent)) {
        return 'timestamp';
    }
    
    // Detect date time format (YYYY-MM-DD HH:mm:ss or similar format)
    const dateTimePattern = /^\d{4}-\d{2}-\d{2}(\s+\d{2}:\d{2}:\d{2})?$/;
    if (dateTimePattern.test(trimmedContent)) {
        return 'datetime';
    }
    
    // Detect JSON format - Support incomplete JSON fragments
    // Exclude pure number cases
    const numberPattern = /^\d+$/;
    if (numberPattern.test(trimmedContent)) {
        // Pure numbers are not considered JSON
    } else {
        // Check if it contains obvious JSON characteristics
        const jsonIndicators = [
            /^\s*\{/,           // Starts with {
            /\}\s*$/,           // Ends with }
            /"[^"]*":/,        // Contains key-value pair format
            /\[\s*\]/,         // Empty array
            /\{\s*\}/          // Empty object
        ];
        
        const hasJsonIndicators = jsonIndicators.some(pattern => pattern.test(trimmedContent));
        
        if (hasJsonIndicators) {
            // Try strict parsing
            try {
                JSON.parse(trimmedContent);
                return 'json';
            } catch (e) {
                // Strict parsing failed, but contains JSON characteristics, still mark as json for JsonTool to handle
                // JsonTool component will be responsible for displaying error messages and repair suggestions
                return 'json';
            }
        }
    }
    
    // Completely not JSON format
    try {
        JSON.parse(trimmedContent);
        return 'json';
    } catch (e) {
        // Not valid JSON
    }
    
    // Detect URL format - Consider as URL if starts with http
    if (trimmedContent.toLowerCase().startsWith('http')) {
        return 'url';
    }
    
    // Detect URL encoding characteristics (%xx format) and verify if decoded content contains http
    const urlEncodedPattern = /%[0-9A-Fa-f]{2}/;
    if (urlEncodedPattern.test(trimmedContent)) {
        try {
            const decoded = decodeURIComponent(trimmedContent);
            if (decoded.toLowerCase().startsWith('http')) {
                return 'url';
            }
        } catch (e) {
            // Decoding failed
        }
    }
    
    // Detect domain format
    const domainPattern = /^[a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?)*\.[a-zA-Z]{2,}$/;
    if (domainPattern.test(trimmedContent)) {
        return 'domain';
    }
    
    // Default return encode (other formats)
    return 'encode';
};



export default function PopUp() {
    const [content, setContent] = useState('');
    const contentType = detectContentType(content);

    // Render corresponding components based on content type
    const renderToolComponent = () => {
        // When content is empty, display default local IP
        if (!content || content.trim() === '') {
            return <IpTool content={content} showMyIp={true} />;
        }
        
        switch (contentType) {
            case 'ip':
            case 'ipv6':
            case 'cidr':
            case 'ipv6cidr':
                // When IP is entered, display both local IP and detailed query results
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
                placeholder="Please enter content... The plugin will intelligently parse based on content"
                id="message-2"
                value={content}
                onChange={(e) => {
                   setContent(e.target.value)
                }}
            />
            
            {/* Display currently detected content type */}
            <div className="px-3 py-2 text-xs text-gray-500 bg-gray-50 border-b">
                Detected format: {
                    !content || content.trim() === '' ? 
                    'Default IP' : 
                    {
                        'ip': 'IPv4 Address',
                        'ipv6': 'IPv6 Address',
                        'cidr': 'IPv4 Subnet',
                        'ipv6cidr': 'IPv6 Subnet',
                        'domain': 'Domain',
                        'cron': 'Cron Expression',
                        'timestamp': 'Timestamp',
                        'datetime': 'Date Time',
                        'json': 'JSON',
                        'url': 'URL',
                        'encode': 'Encoding Format'
                    }[contentType]
                }
            </div>

            {/* Dynamically render tool components */}
            <div className="flex-1 overflow-auto">
                {renderToolComponent()}
            </div>
            
            {/* Bottom GitHub icon */}
            <div className="p-3 border-t flex justify-center bg-gray-50">
                <a 
                    href="https://github.com/liangfeixiang/PasteMagic" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-gray-500 hover:text-gray-700 transition-colors"
                    title="Visit GitHub Repository"
                >
                    <Github className="w-5 h-5" />
                </a>
            </div>
        </div>
    );
}
const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<PopUp/>);