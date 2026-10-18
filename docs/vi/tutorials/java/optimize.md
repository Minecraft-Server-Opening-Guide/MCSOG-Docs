---
title: Tối ưu hiệu năng
slug: optimize
cat: java
level: 3
order: 17
minutes: 15
mc: ["1.21.x", "1.20.4", "1.18.2", "1.16.5"]
tags: [java, nâng cao, tối ưu, tps, spark, khoảng cách hiển thị, jvm, tạo trước]
updated: 2026-10-04
draft: false
---

"Máy chủ lag" là vấn đề phổ biến nhất, nhưng **tối ưu có thứ tự ưu tiên**. Làm theo thứ tự dưới đây thì hiệu quả trên công sức cao nhất; đảo thứ tự thì dễ tốn sức mà chẳng được bao.

## Một, thứ tự ưu tiên

```
1. 硬件（单核性能）        ← 收益最大，花钱也最多
2. 服务端配置（视距/模拟距离）  ← 几乎免费，立竿见影
3. 核心选择（Paper 系 vs 原版）
4. 插件/模组质量（劣质插件是重灾区）
5. JVM 参数
```

**Nói kết luận trước**: nếu máy của bạn đơn nhân rất yếu, **đổi cấu hình hay chỉnh tham số đều không cứu được**, vì luồng chính chỉ có một.

## Hai, tối ưu cấu hình (hiệu quả trên công sức cao nhất)

### Khoảng cách hiển thị và khoảng cách mô phỏng

| Mục | Ảnh hưởng |
| --- | --- |
| `view-distance` | Người chơi nhìn được bao xa. Hạ xuống tiết kiệm CPU và băng thông, cái giá là phía xa mờ sương |
| `simulation-distance` | Chunk trong phạm vi bao xa vẫn **tính toán thật** (sinh quái, redstone, cây trồng). **Hạ nó tiết kiệm nhiều hơn hạ khoảng cách hiển thị, và không ảnh hưởng cảm quan** |

Với phần lớn máy chủ nhỏ, hạ `simulation-distance` từ 10 xuống khoảng 6 là giảm lag rõ rệt.

### Kiểm soát thực thể ở tầng Spigot

Trong `spigot.yml` có vài nhóm mục then chốt liên quan đến thực thể (tên hơi khác giữa các phiên bản):

- **Phạm vi kích hoạt thực thể**: sinh vật trong phạm vi bao xa mới được tick, hạ nhỏ tiết kiệm rất nhiều CPU.
- **Phạm vi sinh quái**: kiểm soát khoảng cách sinh quái.
- **Bán kính gộp thực thể/vật phẩm**: tăng lên giảm được số thực thể (như vật phẩm rơi, quả cầu kinh nghiệm), **nhưng sẽ thay đổi hành vi bản gốc** (kỹ thuật redstone dùng cẩn thận).
- **Số thực thể tick tối đa mỗi tick**: đặt giới hạn cho tính toán thực thể, tránh bùng nổ số lượng làm lag máy chủ.

### Cấu hình thế giới ở tầng Paper

Trong `config/paper-world-defaults.yml` có thể chỉnh: giới hạn va chạm thực thể, số chunk tự động lưu, độ trễ gỡ chunk…

:::warn Tối ưu và "hành vi bản gốc" đánh đổi lẫn nhau
Nhiều công tắc trên đây **giá trị mặc định đã được tối ưu sẵn**, chỉnh càng mạnh càng xa bản gốc. **Máy chủ kỹ thuật redstone hãy làm ngược lại —— chỉnh các mục ảnh hưởng hành vi bản gốc về bản gốc** (xem "Kỹ thuật redstone và máy móc").
:::

## Ba, tìm ra "lag ở đâu" trước rồi mới động tay

**Đừng tối ưu theo cảm giác**. Hãy đo trước:

| Công cụ | Mục đích |
| --- | --- |
| **spark** | Plugin/lệnh phân tích hiệu năng phổ biến nhất hiện nay, tạo được biểu đồ lửa, chỉ thẳng plugin/thực thể/chunk nào đang ăn CPU |
| Lệnh loại `/tps` | Xem TPS hiện tại (dưới 20 là mất tick) |
| **timings** (Paper cũ) | Báo cáo hiệu năng trên phiên bản cũ |

Dùng spark lấy mẫu một khoảng thời gian, **xem dải rộng nhất trong biểu đồ lửa**, rồi xử lý có mục tiêu. Thủ phạm thường gặp:

- Một plugin kém chất lượng làm việc nặng trong vòng lặp;
- Thực thể tích tụ nhiều (tháp sinh quái thu gom không tốt, vật phẩm rơi không dọn);
- Phễu/thiết bị redstone quá nhiều (phễu là sát thủ hiệu năng kinh điển);
- Người chơi chạy bản đồ làm sinh ra lượng lớn chunk mới (xem dưới).

## Bốn, tạo trước thế giới

**Người chơi vừa chạy bản đồ vừa sinh chunk mới** là nguồn lag quan trọng: sinh chunk mới là thao tác ngốn CPU, sẽ làm TPS tụt ngay.

Cách giải quyết là **tạo trước**: dùng plugin như `Chunky` tạo sẵn bản đồ trong phạm vi nhất định. Người chơi đến khu vực đó chỉ còn nạp chunk có sẵn, không kích hoạt sinh mới.

Với **máy chủ sinh tồn mở lâu dài**, tạo trước gần như là việc bắt buộc.

## Năm, tham số JVM

- **RAM**: `-Xmx` cấp đủ nhưng đừng quá mức (quá lớn ngược lại làm GC dừng lâu hơn). Trên máy chuyên dụng có thể để `-Xms` bằng `-Xmx`, giảm co giãn heap.
- **Tham số GC**: cộng đồng có những tổ hợp khuyến nghị chín muồi (như **Aikar's Flags**), trong tài liệu chính thức của Paper có công cụ sinh tham số khởi động và hướng dẫn riêng. **Đừng mù quáng chép những "tham số huyền học" mâu thuẫn nhau trên mạng**.
- Tham số chỉ có ích ở **tầng RAM/GC**, **không cứu được điểm nghẽn đơn nhân**.

## Sáu, các biện pháp thực dụng khác

- **Định kỳ dọn thực thể**: đặt thời gian tồn tại hợp lý cho vật phẩm rơi, quả cầu kinh nghiệm; có plugin làm được việc dọn định kỳ.
- **Giới hạn TNT / redstone tần số cao**: với máy chủ công khai, giới hạn nổ và redstone tần số cao giảm rõ việc lag máy chủ ác ý.
- **Giới hạn chạy bản đồ**: dùng biên giới thế giới (world border) ràng buộc phạm vi hoạt động, tránh sinh vô hạn.
- **Khởi động lại định kỳ**: không phải "tối ưu", nhưng dọn được một phần rò rỉ bộ nhớ của plugin, dùng như **giảm nhẹ tạm thời** thì được (chữa ngọn không chữa gốc).
- **Nâng cấp phần cứng**: nếu spark cho thấy CPU bị luồng chính ăn hết và cấu hình đã tinh chỉnh, thì **đến lúc đổi máy đơn nhân mạnh hơn**.

## Bảy, giới hạn đáy của tối ưu

```
优化不能以牺牲"原版行为"为代价 —— 除非你明确不需要原版行为
```

Với máy chủ kỹ thuật redstone: **thà lag một chút, cũng phải bảo đảm máy móc hoạt động**.
Với máy chủ sinh tồn thường: **có thể mạnh tay vừa phải**, ưu tiên bảo đảm trải nghiệm trực tuyến.

## Kết lời

Đến đây, toàn bộ chuỗi mở máy chủ Java Edition đã đi hết:

```
协议与配置 → 操作系统 → 环境准备 → 服务端选择 → 开启服务端
   → 服务端结构 → 配置服务端 → 部署 → 常用指令
   → MCDR → 插件 → 生电
   → 经营管理 → 跨服端 → 手机玩家 → 备份 → 反作弊 → 性能优化
```

Cần xem lại mắt nào, lúc nào cũng có thể từ mục lục bên trái quay về chương tương ứng. Đối chiếu từng mục khi chọn lõi xem ở [So sánh lõi máy chủ](/wiki/compare#mcsog-h-%E6%A0%B8%E5%BF%83%E5%AF%B9%E7%85%A7).

---

> Một phần nội dung bài này tham khảo từ [NitWikit (Cubic Wiki)](https://nitwikit.8aka.org/) và [kho GitHub của dự án](https://github.com/Cubic-Project/NitWikit), đã viết lại theo cấu trúc của trang này; nếu khác với nguồn thì lấy nguồn làm chuẩn.
