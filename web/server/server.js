const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');
const WebSocket = require('ws');
const { mockData, saveData } = require('./data');

const app = express();
const PORT = 3002;
const serverStartTime = Date.now(); // 添加服務器啟動時間變量

// 中間件
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// 靜態文件服務
app.use('/templates', express.static(path.join(__dirname, 'data/templates')));
app.use('/bitmaps', express.static(path.join(__dirname, 'data/bitmaps')));

// 確保數據目錄存在
const ensureDirectoryExists = (directory) => {
  if (!fs.existsSync(directory)) {
    fs.mkdirSync(directory, { recursive: true });
  }
};

ensureDirectoryExists(path.join(__dirname, 'data/templates'));
ensureDirectoryExists(path.join(__dirname, 'data/bitmaps'));

// ====== API 端點 ======

// 系統信息端點 (v1 版本)
app.get('/api/v1/system', (req, res) => {
  res.json({
    chipId: "MOCK_ESP32",
    freeHeap: 131072,
    version: "1.0.0",
    firmwareUrl: "",
    firmwareVersion: "1.0.0",
    isUpdateAvailable: false,
    uptime: Math.floor((Date.now() - serverStartTime) / 1000),
    deep_sleep_active: mockData.settings.power.sleep_mode === "DEEP_SLEEP"
  });
});

// 系統命令端點
app.post('/api/v1/system', (req, res) => {
  const { command } = req.body;
  
  if (command === 'reboot') {
    // 模擬重啟操作
    res.json({ success: true, message: "System reboot initiated" });
  } else if (command === 'cancel_sleep') {
    // 模擬取消睡眠操作
    res.json({ success: true, message: "Sleep canceled" });
  } else {
    res.status(400).json({ error: `Unknown command: ${command}` });
  }
});

// 變量管理
app.get('/api/v1/variables', (req, res) => {
  res.json(mockData.variables);
});

app.post('/api/v1/variables', (req, res) => {
  const { name, value } = req.body;
  mockData.variables[name] = value;
  saveData();
  
  // 通過WebSocket通知變量更新
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify({
        type: 'variable-update',
        name,
        value
      }));
    }
  });
  
  res.json({ success: true });
});

app.delete('/api/v1/variables/:name', (req, res) => {
  const { name } = req.params;
  delete mockData.variables[name];
  saveData();
  res.json({ success: true });
});

app.get('/api/v1/variables/formatted', (req, res) => {
  // 這裡僅返回原始變量，實際上應該應用格式化邏輯
  res.json(mockData.variables);
});

// 清除所有變量
app.delete('/api/v1/variables', (req, res) => {
  mockData.variables = {};
  saveData();
  res.json({ success: true });
});

// 模板管理
app.get('/api/v1/templates', (req, res) => {
  res.json(mockData.templates);
});

app.get('/api/v1/templates/:name', (req, res) => {
  const { name } = req.params;
  const template = mockData.templates.find(t => t.name === name);
  
  if (!template) {
    return res.status(404).json({ error: 'Template not found' });
  }
  
  res.json(template);
});

app.post('/api/v1/templates', (req, res) => {
  const template = req.body;
  
  // 檢查是否已存在相同名稱的模板
  const existingIndex = mockData.templates.findIndex(t => t.name === template.name);
  
  if (existingIndex >= 0) {
    mockData.templates[existingIndex] = template;
  } else {
    mockData.templates.push(template);
  }
  
  saveData();
  res.json({ success: true });
});

app.delete('/api/v1/templates/:name', (req, res) => {
  const { name } = req.params;
  mockData.templates = mockData.templates.filter(t => t.name !== name);
  saveData();
  res.json({ success: true });
});

// 位圖管理
app.get('/api/v1/bitmaps', (req, res) => {
  // 格式化位圖數據，添加元數據
  const formattedBitmaps = mockData.bitmaps.map(bitmap => {
    return {
      name: `/b/${bitmap.filename}`,
      size: bitmap.data ? bitmap.data.length : 0,
      metadata: bitmap.metadata || { width: 64, height: 64 }
    };
  });
  
  res.json({ bitmaps: formattedBitmaps });
});

// 獲取特定位圖
app.get('/api/v1/bitmaps/:filename', (req, res) => {
  const { filename } = req.params;
  const bitmap = mockData.bitmaps.find(b => b.filename === filename);
  
  if (!bitmap || !bitmap.data) {
    return res.status(404).json({ error: 'Bitmap not found' });
  }
  
  // 發送二進制數據
  const buffer = Buffer.from(bitmap.data);
  res.set('Content-Type', 'application/octet-stream');
  res.send(buffer);
});

// 上傳/更新位圖
app.post('/api/v1/bitmaps', (req, res) => {
  const multer = require('multer');
  const storage = multer.memoryStorage();
  const upload = multer({ storage }).fields([
    { name: 'bitmap', maxCount: 1 },
    { name: 'metadata', maxCount: 1 }
  ]);
  
  upload(req, res, function(err) {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    
    if (!req.files || !req.files.bitmap) {
      return res.status(400).json({ error: 'No bitmap file uploaded' });
    }
    
    const bitmapFile = req.files.bitmap[0];
    let metadata = { width: 64, height: 64 };
    
    // 解析元數據文件（如果存在）
    if (req.files.metadata && req.files.metadata[0]) {
      try {
        const metadataContent = req.files.metadata[0].buffer.toString('utf8');
        metadata = JSON.parse(metadataContent);
      } catch (e) {
        console.error('解析位圖元數據時出錯:', e);
      }
    }
    
    const filename = bitmapFile.originalname;
    const existingIndex = mockData.bitmaps.findIndex(b => b.filename === filename);
    
    const bitmapData = {
      filename: filename,
      data: Array.from(bitmapFile.buffer),
      metadata: metadata
    };
    
    if (existingIndex >= 0) {
      mockData.bitmaps[existingIndex] = bitmapData;
    } else {
      mockData.bitmaps.push(bitmapData);
    }
    
    saveData();
    res.json({ success: true });
  });
});

// 刪除位圖
app.delete('/api/v1/bitmaps/:filename', (req, res) => {
  const { filename } = req.params;
  mockData.bitmaps = mockData.bitmaps.filter(b => b.filename !== filename);
  saveData();
  res.json({ success: true });
});

// WiFi配置
app.get('/api/v1/network/wifi', (req, res) => {
  res.json({
    ssid: mockData.settings.network.wifi_ssid,
    rssi: -65,
    ip: "192.168.1.100",
    hostname: mockData.settings.network.hostname,
    mac: "AA:BB:CC:DD:EE:FF"
  });
});

// MQTT狀態
app.get('/api/v1/mqtt/status', (req, res) => {
  res.json({
    connected: true,
    host: mockData.settings.mqtt.host,
    port: mockData.settings.mqtt.port,
    client_id: "epaper_" + Math.random().toString(16).substring(2, 8),
    last_error: ""
  });
});

// 顯示狀態
app.get('/api/v1/display/status', (req, res) => {
  res.json({
    type: mockData.settings.display.display_type,
    width: 296,
    height: 128,
    current_template: mockData.settings.display.template_name,
    last_updated: Date.now()
  });
});

// 設置管理
app.get('/api/v1/settings', (req, res) => {
  res.json(mockData.settings);
});

app.post('/api/v1/settings', (req, res) => {
  const newSettings = req.body;
  mockData.settings = { ...mockData.settings, ...newSettings };
  saveData();
  res.json({ success: true });
});

// 獲取支援的顯示屏類型
app.get('/api/v1/screens', (req, res) => {
  // 提供模擬的顯示屏類型數據
  const screens = [
    {
      name: "GDEP015OC1",
      desc: "1.54\" B/W",
      width: 200,
      height: 200,
      colors: "BW"
    },
    {
      name: "GDEW0154Z04",
      desc: "1.54\" B/W/R",
      width: 200,
      height: 200,
      colors: "BWR"
    },
    {
      name: "GDE0213B1",
      desc: "2.13\" B/W",
      width: 128,
      height: 250,
      colors: "BW"
    },
    {
      name: "GDEW0213I5F",
      desc: "2.13\" B/W FLEX",
      width: 104,
      height: 212,
      colors: "BW"
    },
    {
      name: "GDEW029T5",
      desc: "2.9\" B/W",
      width: 128,
      height: 296,
      colors: "BW"
    },
    {
      name: "GDEW029Z10",
      desc: "2.9\" B/W/R",
      width: 128,
      height: 296,
      colors: "BWR"
    },
    {
      name: "GDEW042T2",
      desc: "4.2\" B/W",
      width: 400,
      height: 300,
      colors: "BW"
    },
    {
      name: "GDEW075T8",
      desc: "7.5\" B/W",
      width: 640,
      height: 384,
      colors: "BW"
    }
  ];
  
  res.json({ screens });
});

// 啟動HTTP服務器
const server = app.listen(PORT, () => {
  console.log(`模擬ESP32服務器運行在 http://localhost:${PORT}`);
  console.log(`WebSocket服務器運行在 ws://localhost:${PORT}`);
});

// 設置WebSocket服務器
const wss = new WebSocket.Server({ server });

wss.on('connection', (ws) => {
  console.log('客戶端已連接到WebSocket');
  
  // 發送當前變量給新連接的客戶端
  ws.send(JSON.stringify({
    type: 'variable-update-batch',
    variables: mockData.variables
  }));
  
  ws.on('message', (message) => {
    console.log(`收到消息: ${message}`);
    
    try {
      const data = JSON.parse(message);
      
      // 處理變量更新請求
      if (data.type === 'update-variable') {
        mockData.variables[data.name] = data.value;
        saveData();
        
        // 廣播變量更新
        wss.clients.forEach(client => {
          if (client !== ws && client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify({
              type: 'variable-update',
              name: data.name,
              value: data.value
            }));
          }
        });
      }
      
      // 處理模板更新請求
      else if (data.type === 'update-template') {
        const { name, template } = data;
        const templateIndex = mockData.templates.findIndex(t => t.name === name);
        
        if (templateIndex >= 0) {
          mockData.templates[templateIndex] = template;
        } else {
          mockData.templates.push(template);
        }
        
        saveData();
        
        // 廣播模板更新
        wss.clients.forEach(client => {
          if (client !== ws && client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify({
              type: 'template-update',
              name,
              template
            }));
          }
        });
      }
      
      // 處理顯示刷新請求
      else if (data.type === 'refresh-display') {
        // 模擬顯示刷新
        const refreshResponse = {
          type: 'display-refreshed',
          timestamp: Date.now(),
          success: true
        };
        
        ws.send(JSON.stringify(refreshResponse));
        
        // 更新最後刷新時間變量
        mockData.variables.last_display_refresh = String(Math.floor(Date.now() / 1000));
        saveData();
      }
      
      // 處理解析變量請求
      else if (data.type === 'resolve') {
        const { variables } = data;
        const response = {
          type: 'resolve',
          body: variables.map(v => {
            return {
              k: v,
              v: mockData.variables[v] || ''
            };
          })
        };
        
        ws.send(JSON.stringify(response));
      }
    } catch (e) {
      console.error('處理WebSocket消息時出錯:', e);
      ws.send(JSON.stringify({
        type: 'error',
        message: e.message
      }));
    }
  });
});