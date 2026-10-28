---
title: Tình hình sử dụng Cookie
slug: cookies
updated: 2026-10-18
---

Trang này liệt kê từng mục các cookie và lưu trữ cục bộ mà trang ghi vào trình duyệt của bạn, tác dụng của từng mục, và cách bạn xem, sửa hoặc xóa chúng; đồng thời giải thích ba nhóm trong bảng "Cài đặt cookie" mỗi nhóm kiểm soát những gì. Về cách xử lý thông tin tài khoản và nhật ký truy cập, xin xem [Chính sách quyền riêng tư](/privacy).

## Cookie và lưu trữ cục bộ là gì

Cookie là một đoạn văn bản nhỏ mà trang ghi vào trình duyệt, trình duyệt sẽ gửi lại khi truy cập cùng trang đó lần sau, dùng để ghi nhớ trạng thái đăng nhập, ngôn ngữ và những thông tin tương tự. Lưu trữ cục bộ (`localStorage`) và lưu trữ phiên (`sessionStorage`) cũng là kho khóa–giá trị do trình duyệt cung cấp: dữ liệu lưu trên thiết bị của chính bạn, không gửi kèm yêu cầu tới máy chủ, chỉ script trong trang mới đọc ghi được.

Trang này dùng "Cookie" để gọi chung cả nhóm công nghệ này. Mỗi mục dưới đây đều ghi rõ nó thực tế nằm trong Cookie, lưu trữ cục bộ hay lưu trữ phiên. Chúng đều không chứa mã thực thi, cũng không đọc ghi các tệp khác trên thiết bị của bạn.

## Lưu trữ trang này thực tế sử dụng

:::note
Các tên khóa dưới đây đã được đối chiếu từng mục theo mã nguồn trực tuyến, đều có thể tìm thấy trực tiếp trong bảng Application của công cụ nhà phát triển trình duyệt.
:::

### Do chính trang này ghi

| Tên khóa | Vị trí | Tác dụng |
|---|---|---|
| `mcsog_consent` | Lưu trữ cục bộ | Cơ bản · trạng thái đồng ý bạn lưu trong "Cài đặt cookie", bản ghi JSON v2 gồm ba mục bắt buộc, tùy chọn, bên thứ ba cùng thời điểm lưu |
| `mcsog_session` | Cookie | Cơ bản · định danh phiên sau khi đăng nhập bằng tài khoản bên thứ ba, dùng để duy trì trạng thái đăng nhập |
| `mcsog_lang` | Cookie | Cơ bản · tùy chọn ngôn ngữ giao diện, để máy chủ xuất thẳng màn hình đầu theo tiếng Trung hoặc tiếng Anh |
| `mcsog_locale` | Lưu trữ cục bộ | Cơ bản · tùy chọn ngôn ngữ của frontend, dùng song song với `mcsog_lang` |
| `mcsog_theme` | Lưu trữ cục bộ | Tùy chọn · giao diện sáng tối |
| `mcsog_nav` | Lưu trữ cục bộ | Tùy chọn · thanh bên mở rộng đầy đủ hay thu lại thành dải biểu tượng |
| `mcsog_nav_groups` | Lưu trữ cục bộ | Tùy chọn · trạng thái mở và thu của từng nhóm trên thanh bên |
| `mcsog_news_read` | Lưu trữ cục bộ | Tùy chọn · định danh thông báo đã đọc, cùng một thông báo không nhắc lại |
| `mcsog_download_agreement` | Lưu trữ cục bộ | Tùy chọn · bản ghi đồng ý điều khoản ở trang tải xuống và tìm kiếm |
| `mcsog_search_history` | Lưu trữ cục bộ | Tùy chọn · từ khóa lịch sử của ô tìm kiếm, chỉ lưu trong trình duyệt của bạn |
| `mcsog_scroll:<đường dẫn>` | Lưu trữ phiên | Cơ bản · khôi phục vị trí cuộn khi quay lại trang trước, đóng thẻ là hết hiệu lực |
| `mcsog_splash` | Lưu trữ phiên | Cơ bản · hoạt hình mở màn đã phát trong lần truy cập này hay chưa |
| `mcsog_downloads_last` | Lưu trữ phiên | Tùy chọn · phân khu tải xuống đã xem lần trước, dùng để làm nổi bật phân loại hiện tại |
| `mcsog_tutorials_first_seen` | Lưu trữ cục bộ | Tùy chọn · hướng dẫn cho người mới ở trang hướng dẫn đã hiển thị hay chưa |
| `mcsog_edit` | Lưu trữ cục bộ | Tùy chọn · công tắc chế độ biên tập, chỉ thực sự có tác dụng với tài khoản có quyền biên tập |

:::tip
"Cơ bản" nghĩa là cần thiết để trang vận hành và để lựa chọn của bạn được ghi nhớ, "tùy chọn" nghĩa là các thiết lập giúp trang phù hợp với thói quen sử dụng của bạn. Cả hai nhóm đều do mã của trang này ghi trực tiếp, không chứa bất kỳ định danh theo dõi nào của bên thứ ba.
:::

### Bên thứ ba

| Tên khóa | Vị trí | Tác dụng |
|---|---|---|
| `__51uvsct__…`, `__51vcke__…`, `__51vuft__…` | Cookie | Thống kê truy cập 51LA, dùng để phân biệt khách truy cập và thống kê lượt truy cập, thời gian lưu lại, đoạn cuối là ID thống kê của trang |
| `__51huid__…` | Cookie | Định danh khách của phân tích hiệu năng 51LA |
| `__vtins__…` | Lưu trữ cục bộ | Thông tin phiên khách của 51LA |
| `HMACCOUNT` | Cookie | Định danh khách của thống kê Baidu |
| `Hm_lvt_…`, `Hm_lpvt_…` | Cookie và lưu trữ cục bộ | Thời gian và số lần truy cập của thống kê Baidu |

Script của hai bên lần lượt đến từ `sdk.51.la` và `hm.baidu.com`: 51LA cung cấp thống kê truy cập và phân tích hiệu năng trang, thống kê Baidu cung cấp thống kê truy cập. Khách mới mặc định đồng ý tất cả các nhóm, nên ở lần truy cập đầu chúng được tải ngay; sau khi tắt "cookie bên thứ ba" trong bảng và lưu lại, lần tải trang tiếp theo sẽ không yêu cầu các script này nữa, cũng không ghi các khóa trên nữa.

Nếu trang bật bong bóng AI, tiện ích này dùng khóa `astrbot-widget-*` của riêng nó để lưu phiên và vị trí bảng; các khóa đó do tiện ích ghi, không liên quan đến công tắc "cookie bên thứ ba".

## Ba nhóm Cookie kiểm soát những gì

| Nhóm | Bao gồm | Có thể tắt |
|---|---|---|
| Cookie cơ bản | Phiên, trạng thái đồng ý, vị trí cuộn, bản ghi mở màn | Không, cần thiết cho việc vận hành trang |
| Cookie tùy chọn | Các tùy chọn như ngôn ngữ, giao diện, thanh bên, thông báo đã đọc, bản ghi điều khoản | Công tắc ghi nhận lựa chọn của bạn; các thiết lập này vẫn được lưu để lần truy cập sau giữ nguyên |
| Cookie bên thứ ba | Thống kê truy cập và phân tích hiệu năng của 51LA, thống kê Baidu | Có, tắt và lưu thì lần tải sau không yêu cầu nữa |

## Chính sách mặc định và cách thay đổi

Khách mới mặc định đồng ý cả ba nhóm. Bất cứ lúc nào đều có thể bấm "Cài đặt cookie" ở chân trang, bật tắt từng mục rồi bấm "Lưu tùy chọn cookie"; **thay đổi có hiệu lực ở lần tải trang tiếp theo**, các script đang tải hiện tại không bị gỡ bỏ hay chèn thêm ngay sau khi vừa lưu.

## Cách xóa

Trong cài đặt trình duyệt, tìm "Quyền riêng tư và bảo mật" → "Cookie và dữ liệu trang khác", có thể xóa dữ liệu do trang này ghi theo từng trang, cũng có thể dùng cửa sổ ẩn danh để truy cập. Sau khi xóa, trang này sẽ nhắc lại để bạn chọn tùy chọn cookie.

:::warn
Xóa `mcsog_session` sẽ làm mất trạng thái đăng nhập, cần ủy quyền lại một lần; xóa `mcsog_consent` sẽ khiến trang hiện lại bảng cài đặt cookie.
:::

## Rút lại đồng ý

Bấm "Cài đặt cookie" ở chân trang → tắt "cookie bên thứ ba" → lưu. Sau đó trang này không tải script của 51LA và thống kê Baidu nữa. Các cookie bên thứ ba đã ghi vào trình duyệt sẽ tự hết hạn theo thời hạn của chúng, bạn cũng có thể xóa thủ công theo cách ở mục trước. Rút lại đồng ý không ảnh hưởng đến việc bạn tiếp tục xem hướng dẫn hay tải tài nguyên.

## Liên hệ với chúng tôi

Có thắc mắc về các mục liệt kê trên trang này, hoặc phát hiện tên khóa thực tế được ghi không khớp với đây, vui lòng gửi email tới [mcsog@ndpreforged.com](mailto:mcsog@ndpreforged.com), chúng tôi sẽ cập nhật trang này sau khi xác minh.
