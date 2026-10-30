---
title: Quảng cáo
slug: ads
level: 1
minutes: 8
tags: [quảng cáo, ADS, RADS, API, hợp tác]
updated: 2026-10-30
draft: false
---

MCSOG cung cấp vị trí quảng cáo cho máy chủ, công cụ và dự án cộng đồng. Mọi quảng cáo đều được duyệt trước khi hiển thị; chúng tôi có quyền từ chối, điều chỉnh hoặc gỡ quảng cáo.

## ADS là gì?

ADS là hệ thống vị trí quảng cáo của trang. Hiện hỗ trợ banner đầu trang, quảng cáo trong bài viết và các vị trí khác. Mỗi quảng cáo có thể cấu hình:

- Ảnh quảng cáo và liên kết nhấp;
- Tiêu đề chính, tiêu đề phụ và màu tương ứng.

Nội dung quảng cáo phải chính xác, rõ ràng và khớp với trang đích.

## Đăng ký quảng cáo

Vui lòng gửi qua biểu mẫu:

[Gửi yêu cầu hợp tác quảng cáo](https://wj.qq.com/s2/28404050/9smy/)

Nên cung cấp:

- Tên nhà quảng cáo và thông tin liên hệ;
- Tư liệu hình ảnh và URL trang đích;
- Vị trí và thời gian mong muốn;
- Có cần quảng cáo từ xa (RADS) hay không.

Sau khi duyệt, quản trị viên sẽ bật vị trí trong trình chỉnh sửa quảng cáo.

## Quảng cáo từ xa RADS

RADS (Remote Advertising Services, dịch vụ quảng cáo từ xa) cho phép nhà quảng cáo tự vận hành một endpoint HTTPS JSON; MCSOG lấy nội dung khi hiển thị quảng cáo. Phù hợp với chiến dịch thay đổi ảnh, nội dung hoặc trang đích thường xuyên.

:::warn Lưu ý
Sau khi đánh dấu quảng cáo từ xa, tính năng phải được duyệt trước khi bật.
:::
## Đặc tả API

### Yêu cầu

- Phương thức: `GET`
- Phản hồi: `application/json; charset=utf-8`
- Header: `Accept: application/json`
- Không gửi Cookie và không dùng xác thực token; endpoint phải truy cập công khai
- Header CORS: `Access-Control-Allow-Origin: *` hoặc `https://mcsog.ndpreforged.com`

### Mẫu trống

```json
{
  "settings": {
    "imageUrl": "",
    "clickUrl": "",
    "mainTitle": "",
    "mainTitleColor": "",
    "subTitle": "",
    "subTitleColor": ""
  }
}
```

### Trường dữ liệu

| Trường | Ý nghĩa | Ghi chú |
| --- | --- | --- |
| `imageUrl` | Ảnh quảng cáo | Bắt buộc; `https://...` hoặc `/assets/...` |
| `clickUrl` | Liên kết nhấp | Không bắt buộc; `https://...` hoặc `/...` |
| `mainTitle` | Tiêu đề chính | Văn bản, nên tối đa 80 ký tự |
| `mainTitleColor` | Màu tiêu đề chính | Màu HEX |
| `subTitle` | Tiêu đề phụ | Văn bản, nên tối đa 120 ký tự |
| `subTitleColor` | Màu tiêu đề phụ | Màu HEX |

Màu hỗ trợ `#RGB`, `#RGBA`, `#RRGGBB`, `#RRGGBBAA`. Màu trống hoặc sai định dạng sẽ dùng màu mặc định.

### Giá trị trống và dự phòng

- `imageUrl` trống: dùng ảnh cục bộ đã lưu; nếu không có thì không hiển thị quảng cáo;
- `clickUrl` trống: không tạo liên kết;
- Tiêu đề, tiêu đề phụ trống: ẩn phần đó;
- HTTP khác 200, JSON không hợp lệ, thiếu `settings`, lỗi CORS, quá thời gian hoặc lỗi mạng: dùng nội dung cục bộ.

### Ví dụ máy chủ

```php
<?php
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Accept');
header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

echo json_encode([
    'settings' => [
        'imageUrl' => 'https://cdn.example.com/ad/banner.png',
        'mainTitle' => 'Chào mừng đến với MCSOG',
        'mainTitleColor' => '#FFFFFF',
        'subTitle' => 'Nhóm QQ: 1083430859',
        'subTitleColor' => '#FFFFFF'
    ]
], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
```

## Các bước tích hợp

:::step Liên hệ người phụ trách
Thông tin liên hệ có trong nhóm QQ hoặc biểu mẫu đăng ký quảng cáo.
:::

:::step Cung cấp URL API
Cung cấp URL API quảng cáo từ xa cho người phụ trách.
:::

:::step Duyệt và bật
Sau khi duyệt, quản trị viên sẽ bật quảng cáo từ xa.
:::
## Duyệt và vi phạm

- Tư liệu, trang đích và nội dung endpoint từ xa phải tuân thủ quy định của trang và pháp luật;
- Chúng tôi có thể yêu cầu chỉnh sửa, tạm dừng hoặc gỡ quảng cáo mà không cần báo trước;
- Thay đổi nội dung từ xa vẫn phải được duyệt; không được dùng cập nhật từ xa để vượt duyệt.

:::danger Nguy hiểm
Lưu ý: sau khi bật quảng cáo từ xa, nếu dữ liệu quảng cáo vi phạm quy định, chúng tôi sẽ xử phạt theo quy định, bao gồm thu hồi quyền, xóa quảng cáo, dừng chiến dịch và không hoàn phí tháng hiện tại.
:::
