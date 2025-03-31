# Bitmap API 管理指南

本文檔詳細說明了E-Paper模板系統中位圖(Bitmap)的創建、上傳和管理流程。

## Bitmap格式說明

在E-Paper系統中，位圖(Bitmap)是以特定格式存儲的二進制圖像文件：

- 每個像素用1個位元(bit)表示，值為1表示像素"開啟"(黑色)，值為0表示像素"關閉"(白色)
- 像素排列順序為行優先，從左到右，從上到下
- 每8個像素打包為1個位元組(byte)
- 原始的bitmap文件不包含尺寸信息，因此需要額外的metadata來記錄寬度和高度

例如：一個8x8像素的圖像總共需要8個位元組(64位元)來表示。

## 操作流程

### 1. 創建/上傳Bitmap

系統支持兩種方式創建或上傳bitmap：

#### 通過Web UI創建

1. 訪問Web UI的Bitmap頁面
2. 點擊"New Bitmap"按鈕
3. 輸入bitmap名稱和尺寸(寬度和高度)
4. 點擊"Create Bitmap"後，可以使用像素編輯器繪製圖像
5. 點擊"Save"保存bitmap

#### 通過Web UI導入現有圖像

1. 在bitmap編輯頁面，點擊左側工具欄中的文件夾圖標
2. 上傳一個圖像文件(支持常見的圖像格式)
3. 調整敏感度滑塊以控制黑白轉換閾值
4. 點擊"Import"按鈕導入圖像
5. 可以進一步編輯導入的圖像
6. 點擊"Save"保存bitmap

#### 通過API上傳

使用HTTP POST請求將bitmap上傳到服務器：

```
POST /api/v1/bitmaps
Content-Type: multipart/form-data
```

請求需要包含以下字段：
- `bitmap`: 二進制bitmap文件
- `metadata`(可選): 包含寬度和高度的JSON文件

如果未提供metadata，系統將默認使用64x64的尺寸。

### 2. 獲取Bitmap列表

```
GET /api/v1/bitmaps
```

返回的JSON數據包含所有可用bitmap的列表，每個bitmap項目包含：
- `name`: bitmap的路徑名稱
- `size`: bitmap文件大小(位元組)
- `metadata`: 包含寬度(`width`)和高度(`height`)的對象

### 3. 獲取特定Bitmap

```
GET /api/v1/bitmaps/:filename
```

返回特定bitmap的二進制內容，Content-Type為`application/octet-stream`。

### 4. 刪除Bitmap

```
DELETE /api/v1/bitmaps/:filename
```

從系統中刪除指定的bitmap文件。

## 存儲格式詳解

### Bitmap二進制格式

在內部存儲時，bitmap的二進制格式為簡單的位元數組，每8個像素打包為1個位元組。例如：

```
10101010 11110000 10000001 ...
```

這表示第一行的前8個像素分別是：開、關、開、關、開、關、開、關。

### Metadata格式

Metadata以JSON格式存儲，包含以下字段：
```json
{
  "width": 64,  // 位圖寬度
  "height": 64, // 位圖高度
  "hash": "..." // 可選，用於緩存
}
```

## 工具和實用程序

### 像素編輯器功能

Web UI提供的位圖編輯器包含以下功能：
- 鉛筆工具：像素級編輯
- 填充工具：填充連續區域
- 調整大小：調整位圖尺寸
- 下載：將位圖下載為二進制文件
- 導入：從現有圖像導入

### 通過命令行上傳

您也可以使用提供的shell腳本上傳bitmap文件：

```bash
./scripts/upload_bitmaps.sh SERVER_URL bitmap1.bin bitmap2.bin ...
```

## 整合到模板中

位圖可以在模板中使用，通過設置BitmapRegion並引用位圖的名稱：

```json
{
  "type": "bitmap",
  "x": 10,
  "y": 10,
  "bitmap_name": "example.bin"
}
```

### 常見問題排解

1. **上傳失敗**：確保bitmap格式正確，並且請求包含必要的文件字段
2. **顯示不正確**：檢查metadata中的寬度和高度是否與實際bitmap尺寸匹配
3. **圖像質量問題**：調整導入時的敏感度設置，或使用像素編輯器手動調整