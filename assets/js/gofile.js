// GoFile.io 配置
const GOFILE_ACCOUNT_ID = '9e174948-3c6c-47e6-a706-8aedbf7b8598';
const GOFILE_ACCOUNT_TOKEN = '8UO7T53rxM6Eh3WzolDR4SeaLedZ17bE';

// 获取GoFile服务器
async function getGoFileServer() {
    try {
        const response = await fetch('https://api.gofile.io/getServer');
        if (!response.ok) {
            throw new Error(`获取服务器失败，状态码: ${response.status}`);
        }
        const data = await response.json();
        
        if (data.status === 'ok') {
            return data.data.server;
        } else {
            throw new Error('无法获取GoFile服务器: ' + data.status);
        }
    } catch (error) {
        console.error('获取GoFile服务器错误:', error);
        throw error;
    }
}

// 上传文件到GoFile
async function uploadToGoFile(file, onProgress) {
    try {
        // 获取服务器
        const server = await getGoFileServer();
        
        // 创建FormData
        const formData = new FormData();
        formData.append('token', GOFILE_ACCOUNT_TOKEN);
        formData.append('file', file);
        
        // 使用XMLHttpRequest上传以支持进度
        return new Promise((resolve, reject) => {
            const xhr = new XMLHttpRequest();
            xhr.open('POST', `https://${server}.gofile.io/uploadFile`, true);
            
            // 上传进度
            xhr.upload.addEventListener('progress', (event) => {
                if (event.lengthComputable) {
                    const percent = Math.round((event.loaded / event.total) * 100);
                    if (onProgress) onProgress(percent);
                }
            });
            
            // 完成处理
            xhr.onload = () => {
                if (xhr.status === 200) {
                    try {
                        const response = JSON.parse(xhr.responseText);
                        if (response.status === 'ok') {
                            resolve(response.data);
                        } else {
                            reject(new Error('上传失败: ' + (response.data || response.status)));
                        }
                    } catch (e) {
                        // 尝试解析错误响应
                        try {
                            const errorResponse = JSON.parse(xhr.responseText);
                            if (errorResponse.status === 'error-notFound') {
                                reject(new Error('服务器不可用，请稍后重试'));
                            } else {
                                reject(new Error('上传失败: ' + (errorResponse.data || errorResponse.status)));
                            }
                        } catch (parseError) {
                            reject(new Error('服务器返回无效响应: ' + xhr.responseText));
                        }
                    }
                } else {
                    // 处理非200状态码
                    let errorMessage = `上传失败，状态码: ${xhr.status}`;
                    try {
                        const errorResponse = JSON.parse(xhr.responseText);
                        if (errorResponse.data && errorResponse.data.message) {
                            errorMessage += ': ' + errorResponse.data.message;
                        } else if (errorResponse.status) {
                            errorMessage += ': ' + errorResponse.status;
                        }
                    } catch (e) {
                        if (xhr.responseText) {
                            errorMessage += ': ' + xhr.responseText;
                        }
                    }
                    reject(new Error(errorMessage));
                }
            };
            
            // 错误处理
            xhr.onerror = () => {
                reject(new Error('网络错误，请检查连接'));
            };
            
            xhr.onabort = () => {
                reject(new Error('上传已取消'));
            };
            
            // 发送请求
            xhr.send(formData);
        });
    } catch (error) {
        console.error('上传到GoFile错误:', error);
        throw error;
    }
}

// 获取书柜中的漫画（从localStorage）
async function getComicsInBookcase(bookcaseId) {
    try {
        // 从localStorage获取书柜中的漫画
        const files = JSON.parse(localStorage.getItem(`bookcase_${bookcaseId}_files`) || '[]');
        return files.map(file => ({
            name: file.name,
            url: file.directLink,
            format: file.name.endsWith('.pdf') ? 'pdf' : 'zip'
        }));
    } catch (error) {
        console.error('获取书柜漫画错误:', error);
        throw error;
    }
}
