const fs = require('fs');
const path = require('path');

// 初始模擬數據
let mockData = {
  variables: {
    timestamp: String(Math.floor(Date.now() / 1000)),
    wifi_state: "connected",
    mqtt_state: "connected",
    temperature: "23.5",
    humidity: "45",
    weather: "晴天",
    battery: "95",
    date: new Date().toISOString().split('T')[0],
    time: new Date().toTimeString().split(' ')[0],
    last_display_refresh: String(Math.floor(Date.now() / 1000))
  },
  templates: [
    {
      name: "default_template",
      width: 296,
      height: 128,
      background_color: "white",
      texts: [
        {
          x: 10,
          y: 30,
          color: "black",
          font: "sans-24",
          background_color: "white",
          value: { 
            type: "variable", 
            variable: "time"
          }
        },
        {
          x: 10,
          y: 70,
          color: "black",
          font: "sans-18",
          background_color: "white",
          value: { 
            type: "variable", 
            variable: "date" 
          }
        },
        {
          x: 10,
          y: 110,
          color: "black",
          font: "sans-16",
          background_color: "white",
          value: { 
            type: "variable", 
            variable: "weather" 
          }
        }
      ],
      rectangles: [],
      bitmaps: [],
      lines: []
    }
  ],
  bitmaps: [],
  settings: {
    display: {
      display_type: "GxEPD2_290_T5D",
      template_name: "default_template"
    },
    mqtt: {
      host: "localhost",
      port: 1883,
      username: "",
      password: "",
      client_status_topic: "epaper/status",
      variables_topic_pattern: "epaper/variables/:variable_name"
    },
    network: {
      wifi_ssid: "MOCK_WIFI",
      hostname: "epaper-mock",
      mdns_name: "epaper-mock",
      ntp_server: "pool.ntp.org"
    },
    power: {
      sleep_mode: "ALWAYS_ON",
      sleep_interval_seconds: 300
    },
    system: {
      timezone: "UTC",
      hardware_pins: {
        DC: 17,
        RST: 16,
        BUSY: 7
      }
    },
    web: {
      port: 80,
      auth_enabled: false,
      auth_username: "admin",
      auth_password: "admin"
    }
  }
};

// 數據文件路徑
const dataFilePath = path.join(__dirname, 'data/mockData.json');

// 確保數據目錄存在
const ensureDirectoryExists = (directory) => {
  if (!fs.existsSync(directory)) {
    fs.mkdirSync(directory, { recursive: true });
  }
};

// 加載模擬數據
const loadData = () => {
  try {
    ensureDirectoryExists(path.dirname(dataFilePath));
    
    if (fs.existsSync(dataFilePath)) {
      const data = JSON.parse(fs.readFileSync(dataFilePath, 'utf8'));
      mockData = data;
    } else {
      // 如果文件不存在，保存初始數據
      saveData();
    }
  } catch (error) {
    console.error('加載模擬數據時出錯:', error);
  }
};

// 保存模擬數據
const saveData = () => {
  try {
    ensureDirectoryExists(path.dirname(dataFilePath));
    fs.writeFileSync(dataFilePath, JSON.stringify(mockData, null, 2));
  } catch (error) {
    console.error('保存模擬數據時出錯:', error);
  }
};

// 在啟動時加載數據
loadData();

// 更新時間變量的函數
const updateTimeVariables = () => {
  mockData.variables.timestamp = String(Math.floor(Date.now() / 1000));
  mockData.variables.date = new Date().toISOString().split('T')[0];
  mockData.variables.time = new Date().toTimeString().split(' ')[0];
};

// 每分鐘更新時間變量
setInterval(updateTimeVariables, 60000);

module.exports = {
  mockData,
  saveData,
  loadData,
  updateTimeVariables
};