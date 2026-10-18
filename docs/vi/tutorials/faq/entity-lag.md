---
title: Lag do thực thể và vật rơi tích tụ
slug: entity-lag
cat: faq
level: 2
order: 4
minutes: 16
tags: [java, faq, lag, entity, item, hopper, tps, spark]
updated: 2026-10-04
draft: false
---

TPS của máy chủ từ 20 tụt xuống một chữ số, `/spark tps` cho thấy MSPT lâu dài cao hơn 50 ms, nhưng mức chiếm CPU không cao, bộ nhớ cũng không nổ —— kiểu lag này phần nhiều không phải máy không đủ, mà là **thực thể (entity) và thực thể khối (block entity) tích tụ**.

Lag do thực thể có hai đặc điểm: nó **không ăn mấy bộ nhớ, nhưng ăn CPU luồng chính thật sự**; và **khởi động lại chỉ làm dịu được vài phút**, chỉ cần nguồn phát sinh còn đó, tích tụ sẽ quay lại ngay. Bài này đi theo thứ tự "vì sao lag → vật rơi → sinh vật → phễu → kiểm tra thế nào → hiểu lầm".

:::note Phạm vi áp dụng
Bài này chủ yếu nói về máy chủ Java Edition (bản gốc / hệ Spigot / Paper). Các khóa cấu hình xuất hiện trong bài đều ghi rõ nó thuộc tệp nào; **cấu trúc và giá trị mặc định thay đổi theo lõi và phiên bản**, trước khi động tay hãy xem tệp cấu hình do máy bạn sinh ra.
:::

## 1. Vì sao thực thể là sát thủ hiệu năng

### 1.1 Mọi thứ đều xếp hàng trên luồng chính

Logic chính của máy chủ Minecraft là **vòng tick đơn luồng**: mỗi giây chạy 20 tick, ngân sách một tick là **50 ms** (tức là MSPT thường nói). Mọi tính toán của mọi thế giới, mọi thực thể, mọi thực thể khối đều phải xếp hàng làm xong trên luồng này.

```
1 giây = 20 tick, ngân sách mỗi tick 50 ms
MSPT 40 ms  → TPS 20 (khỏe)
MSPT 60 ms  → TPS tụt còn khoảng 16 (bắt đầu lag)
MSPT 200 ms → TPS 5 (gần như không chơi được)
```

Nên "nhiều thực thể" chí mạng là vì nó **trực tiếp tiêu ngân sách thời gian của luồng duy nhất này**. CPU có bao nhiêu nhân, cấp bộ nhớ bao lớn, đều không cứu được luồng chính (chi tiết xem [Tối ưu hiệu năng](/tutorials/java/optimize)).

### 1.2 Mỗi tick mỗi thực thể làm gì

Một thực thể mỗi tick thường phải đi qua các khâu:

- **AI và chọn mục tiêu**: goal selector, tìm đường (pathfinding), quét cảm biến (sensor);
- **Vật lý và va chạm**: trọng lực, di chuyển, kiểm tra va chạm với thực thể và khối khác;
- **Bộ đếm**: bắt lửa, hiệu ứng thuốc, đếm ngược biến mất (despawn);
- **Kiểm tra gộp**: vật rơi và quả cầu kinh nghiệm phải kiểm tra quanh đó có cùng loại để gộp không;
- **Theo dõi và đồng bộ**: xác định người chơi nào cần nhận cập nhật vị trí của nó.

Thực thể sinh vật chiếm nhiều nhất trong các mục này (nhất là tìm đường và cảm biến); chi phí đơn lẻ của vật rơi nhỏ hơn nhiều, nhưng **số lượng có thể dễ dàng lên đến hàng chục nghìn** —— đó là lý do "một chunk vài nghìn vật rơi" chí mạng hơn "vài chục con zombie".

### 1.3 Phân loại: cái gì tick, cái gì không

| Loại | Mỗi tick có tính toán không | Mô tả |
| --- | --- | --- |
| Sinh vật / động vật / quái | Có | Loại tốn kém nhất: AI, tìm đường, cảm biến, va chạm |
| Vật rơi (thực thể vật phẩm) | Có | Đơn lẻ rẻ, nhưng sẽ tích tụ đến số lượng cực lớn; có đếm ngược biến mất và kiểm tra gộp |
| Quả cầu kinh nghiệm | Có | Tương tự vật rơi; lõi thường cung cấp tùy chọn giới hạn gộp |
| Vật phóng (tên, đinh ba, quả cầu tuyết, quả cầu lửa, ngọc Ender) | Có | Tính toán vật lý thuần; trong `spigot.yml` có `arrow-despawn-rate`, `trident-despawn-rate` (tài liệu chính thức Paper hiện ghi là 1200) |
| Xe mỏ / thuyền | Có | Thực thể + va chạm + logic người ngồi; xe mỏ phễu còn vận chuyển vật phẩm |
| Thực thể treo như khung trưng bày / tranh / nút dây | Có (tần suất thấp) | `hanging-tick-frequency` trong `spigot.yml` (wiki Spigot ghi mặc định 100) kiểm soát khoảng cập nhật của chúng |
| Giá để giáp / marker | Có | Cả hai đều là thực thể; trong `paper-world-defaults.yml` của Paper có `entities.armor-stands.tick`, `entities.markers.tick` (hiện mặc định đều là `true`), có thể tắt để tiết kiệm chi phí |
| Lồng sinh quái | Có | Thực thể khối, mỗi tick tính vùng có thể sinh quái |
| Phễu | Có | Thực thể khối, sát thủ hiệu năng kinh điển, xem mục 4 |
| Lò nung / lò cao / lò hun khói | Chỉ khi đang đốt | Lò nung rảnh không có logic mỗi tick |
| Rương / thùng gỗ / hộp shulker | Không (bản thân không tick) | Vật chứa thuần không có logic thực thể khối mỗi tick, chỉ phát sinh chi phí khi bị mở hoặc bị phễu truy cập |
| Khối lệnh | Không (chỉ khi được kích hoạt) | Rảnh thì không tính toán |

:::warn "Khối vật chứa" không bằng "luôn đang tính"
Điểm dễ lẫn nhất: **những "khối vật chứa" như rương, lò nung bản thân không tính toán mỗi tick**, thứ thật sự tính toán mỗi tick là **thực thể khối (block entity)** gắn trên khối, và chỉ những cái có ticker (phễu, lồng sinh quái, lò nung đang đốt) mới ăn CPU. Nên "trong rương nhiều đồ" không lag, "chuỗi phễu vừa dài vừa rảnh" mới lag.
:::

### 1.4 Nạp chunk và tick chunk không phải một chuyện

Thực thể chỉ tính toán trong **chunk đang tick**, còn chunk "được nạp" không nhất thiết đang tick. `/paper chunkinfo` của Paper chia chunk hiện tại thành mấy loại (định nghĩa xem tài liệu lệnh chính thức của Paper):

| Loại | Ý nghĩa |
| --- | --- |
| Entity Ticking | Tick đầy đủ: thực thể, khối, sinh quái đều chạy |
| Block Ticking | Thường gọi là lazy chunk: logic khối chạy, nhưng thực thể không tick |
| Full | Thường gọi là border chunk: không tick, nhưng khối và thực thể vẫn truy cập được |
| Inactive | Không truy cập được, chỉ dùng khi sinh chunk |
| Total | Tổng của các loại trên |

Điều này giải thích hai hiện tượng thường gặp:

- **Sinh vật ở xa không nhất thiết làm lag máy chủ**: chunk của chúng có thể chỉ là Block Ticking hoặc Full, thực thể hoàn toàn không được tick;
- **Nạp không bằng tính toán**: `/paper holderinfo` hiển thị số chunk đang giữ trong bộ nhớ, không phải một chuyện với tải tick trên CPU.

:::note Vật rơi không tự nạp chunk
Nói chặt chẽ, bản thân vật rơi **không** "nạp" chunk lên —— thứ duy trì nạp chunk trong bản gốc là người chơi, chunk điểm sinh, cổng dịch chuyển, `/forceload` và plugin. Nhưng chỉ cần vùng chunk đó được giữ nạp vì các lý do trên, vật rơi trong đó sẽ tick mãi, tích tụ mãi.
:::

### 1.5 Phạm vi kích hoạt thực thể (activation range)

Để những thực thể "đang nạp nhưng quanh đó không có ai" không ăn CPU vô ích, hệ Spigot đưa ra **phạm vi kích hoạt thực thể**: thực thể vượt khoảng cách này **không phải không nạp, mà là giảm tần suất tick**.

Giải thích của tài liệu chính thức Paper về `entity-activation-range` trong `spigot.yml` là: khoảng cách (đơn vị khối) với người chơi mà trong đó thực thể tick bình thường; vượt phạm vi đó thì tần suất tick của thực thể giảm; đặt 0 hoặc nhỏ hơn thì tắt tiết chế của loại đó, để thực thể đã nạp tick bình thường dù xa bao nhiêu.

Cấu trúc tài liệu Paper hiện liệt kê như sau (**giá trị mặc định thay đổi theo phiên bản, lấy tệp cục bộ của bạn làm chuẩn**):

```yaml
# spigot.yml → world-settings.default
entity-activation-range:
  animals: 32
  monsters: 32
  raiders: 64
  misc: 16
  water: 16
  villagers: 32
  flying-monsters: 32
  wake-up-inactive:
    animals-every: 1200
    animals-for: 100
    animals-max-per-tick: 4
    monsters-every: 400
    monsters-for: 100
    monsters-max-per-tick: 8
    villagers-every: 600
    villagers-for: 100
    villagers-max-per-tick: 4
    flying-monsters-every: 200
    flying-monsters-for: 100
    flying-monsters-max-per-tick: 8
  villagers-work-immunity-after: 100
  villagers-work-immunity-for: 20
  villagers-active-for-panic: true
  tick-inactive-villagers: true
  ignore-spectators: false
```

Hai cái giá bắt buộc phải biết:

- Nếu tắt `tick-inactive-villagers` (tài liệu Paper hiện mặc định `true`), **dân làng sẽ không làm việc theo bản gốc**, người chơi phải đứng gần mới bổ sung hàng;
- `wake-up-inactive` quyết định thực thể "đang ngủ" bao lâu bị đánh thức một lần, chỉnh quá keo kiệt sẽ khiến máy móc và nông trại hành vi bất thường rõ rệt.

Kết hợp với [Kỹ thuật redstone và redstone](/tutorials/java/redstone): **máy chủ kỹ thuật redstone hãy cẩn thận khi động vào đây**, hoặc đơn giản là đổi sang Fabric / Leaves.

## 2. Vật rơi tích tụ

### 2.1 Nguyên nhân thường gặp

- **Nông trại không có vòng khép kín giết và thu**: tháp sinh quái ném thẳng vật rơi xuống đất;
- **Xương rồng / mía / nông trại tự động nhả sản phẩm ra đất**;
- **Người chơi tiện tay vứt đồ**: dọn túi đồ, chết rơi đồ, chuyển nhà vứt rác;
- Thực thể do các thiết bị nhân bản như **máy nhân bản TNT / cát** sinh ra;
- **Chuỗi phễu bị đứt**: rương đích đầy, phễu bị chặn, chunk gỡ nạp khiến vật phẩm kẹt giữa đường, trong khi phía trên vẫn tiếp tục sản xuất;
- **Lạm dụng `/give` hoặc khối lệnh phát vật phẩm theo vòng**;
- **Nông trại chạy qua đêm**: trong chunk điểm sinh, `/forceload`, chunk bị plugin cưỡng chế nạp, máy móc vẫn chạy khi không có ai.

### 2.2 Vì sao vật rơi lại hại đến thế

- **Đơn lẻ rẻ, số lượng đáng sợ**: một chunk vài nghìn vật rơi, cộng dồn lại là MSPT đáng kể;
- **Gộp không tích cực như tưởng**: vật phẩm bản gốc chỉ gộp trong khoảng cách rất gần; `entities.behavior.only-merge-items-horizontally` của Paper (hiện mặc định `false`) kiểm soát có chỉ gộp vật phẩm cùng độ cao hay không, đặt `true` tránh được vài bất thường thị giác, nhưng **gộp sẽ ít hơn**;
- **Mỗi vật rơi đều phải tick**: vật lý, đếm ngược biến mất, kiểm tra gộp không thiếu thứ nào;
- **Phễu phải quét chúng**: vật rơi phía trên phễu là một trong những nguồn khiến phễu làm việc liên tục (xem mục 4);
- **Khi người chơi đến gần bị hút vào túi**, mang thêm chi phí túi đồ và mạng;
- **Bản lưu cũng to ra**: thực thể phải ghi vào bản lưu chunk, số lượng lớn thì thời gian lưu và dung lượng bản lưu đều tăng.

### 2.3 Chẩn đoán

Trước tiên dùng biện pháp **nhìn thấy được số lượng**, chứ đừng dựa vào cảm giác:

| Biện pháp | Công dụng |
| --- | --- |
| `/paper entity list minecraft:item` | Lệnh Paper, liệt kê thực thể đang tick, đầu ra dạng `Total Ticking: N, Total Non-Ticking: M`, và cho theo loại (số ticking, số không ticking). Vật rơi xuất hiện nhiều ở phía không ticking nghĩa là chúng bị tiết chế ngoài phạm vi kích hoạt —— tổng số vẫn đáng quan tâm |
| `/spark tps`, `/spark health` | Trước tiên phán đoán "có thật sự lag không", lag ở TPS hay bộ nhớ/đĩa |
| `/spark profiler start --timeout 60` | Lấy mẫu rồi xem tỷ lệ của `ItemEntity.tick`, `Entity.tick` trong cây gọi |
| `/spark tickmonitor --threshold-tick 100` | Chỉ báo các tick vượt 100 ms, kết hợp thao tác tại chỗ để định vị |
| `/paper chunkinfo` | Xem phân bố loại chunk đang nạp của từng thế giới, phán đoán là "nạp quá nhiều" hay "thực thể quá nhiều" |
| `/forceload query` | Tra những chunk bị cưỡng chế nạp (nông trại trong loại chunk này dễ mất kiểm soát nhất) |
| `/debug start` / `/debug stop` | Lấy mẫu hiệu năng có sẵn của bản gốc, sinh debug profile |

Cách dùng đầy đủ của spark và cách đọc biểu đồ xem [Phân tích hiệu năng bằng spark](/tutorials/ops/spark).

**`/kill @e[type=item]` là cây gậy tày**, chỉ dùng khi cấp cứu:

```bash
# Dọn toàn bộ vật rơi trong các chunk đã nạp hiện tại
/kill @e[type=item]

# Giới hạn phạm vi: trong 64 khối quanh người thực thi
/kill @e[type=item,distance=..64]
```

:::warn Dọn vật rơi là không thể hoàn tác
Nó sẽ **xóa không phân biệt mọi vật phẩm trên đất**: đồ người chơi vừa vứt, thứ nông trại đang thu, trang bị rơi khi chết, mất hết, và không khôi phục được. **Đừng tiện tay chạy toàn máy chủ khi có người chơi trực tuyến**; càng đừng coi nó là phương án lâu dài —— nửa tiếng sau trên đất lại một mớ.
:::

**Định vị "một chunk nào đó có vài nghìn thực thể" thế nào?** Tổng số thực thể chỉ nói cho bạn "nhiều", không nói "ở đâu". Có thể tìm theo thứ tự này:

1. Trước tiên dùng `/paper chunkinfo` loại trừ nguyên nhân "nạp quá nhiều chunk";
2. Rồi lấy mẫu bằng spark, so sánh điểm nóng giữa các thế giới, các vùng khác nhau, hoặc bật `/spark tickmonitor --threshold-tick 100` chạy đến vùng khả nghi, xem tick có dài ra rõ rệt không;
3. Dùng bộ chọn `@e` đếm theo phạm vi: đứng ở vị trí khả nghi chạy `/execute if entity @e[type=item,distance=..16]`, từ số lần thành công trong phản hồi lệnh phán đoán bậc số lượng (định dạng phản hồi khác nhau theo phiên bản, lấy đầu ra thực tế làm chuẩn);
4. Khi cần theo dõi lâu dài, dùng plugin hoặc công cụ bảng điều khiển có thể liệt kê số thực thể theo chunk.

:::tip timings là chuyện của phiên bản cũ
Báo cáo hiệu năng của Paper cũ là **timings**. Tài liệu chính thức Paper hiện xếp `/tps`, `/mspt` vào phạm vi "đã bị `/spark` thay thế" —— **dùng được spark thì dùng spark**, khẩu độ báo cáo thống nhất, cũng dễ so sánh hơn.
:::

### 2.4 Xử lý

**Bước đầu tiên luôn là sửa thiết kế, chứ không phải sửa cấu hình.** Cho nông trại thành vòng khép kín: phòng giết + thu bằng dòng nước hoặc xe mỏ phễu + vào thẳng rương, sản phẩm không rơi xuống đất nữa.

**Bước thứ hai mới là cấu hình và plugin.**

**Thời gian tồn tại của vật rơi**: cơ chế bản gốc là vật rơi biến mất sau khoảng 5 phút (6000 tick). Đa số lõi cho phép chỉnh thời lượng này, thậm chí đặt riêng theo loại vật phẩm, nhưng **tên khóa, cấp chứa và giá trị mặc định khác nhau theo lõi và phiên bản**, hãy lấy tệp cấu hình do máy bạn sinh ra và tài liệu chính thức làm chuẩn.

**Plugin dọn định kỳ** (cộng đồng thường dùng loại ClearLag). Khi chọn và cấu hình cần xác nhận trọng tâm:

- **Khoảng cách dọn**: bao lâu dọn một lần (thường 5~10 phút);
- **Đối tượng dọn**: chỉ dọn `item`, hay dọn cả quả cầu kinh nghiệm, vật phóng, quái (loại sau dễ làm oan hơn);
- **Thông báo trước**: cho đếm ngược trước khi dọn, tránh người chơi đang nhặt đồ bị dọn mất;
- **Quy tắc bảo vệ**: bỏ qua vật phẩm có tên tùy chỉnh, bỏ qua đồ rơi khi người chơi chết, bỏ qua thế giới hoặc vùng chỉ định (vùng thu sản phẩm đặc biệt phải loại trừ);
- **Tương thích**: xác nhận plugin hỗ trợ lõi và phiên bản game của bạn (xem [Nhập môn plugin](/tutorials/java/plugins)).

**Bán kính gộp `merge-radius`**: đây là khóa thực sự tồn tại trong hệ Spigot / Paper, nằm dưới world-settings của `spigot.yml`, chia hai mục vật phẩm và quả cầu kinh nghiệm. Cấu trúc tài liệu chính thức Paper hiện liệt kê là:

```yaml
# spigot.yml → world-settings.default
merge-radius:
  item: 0.5
  exp: -1
```

Cần chú ý **hai tài liệu có thẩm quyền không thống nhất**: wiki Spigot ghi giá trị mặc định của cùng bộ khóa này là item 2.5 / exp 3.0, và mô tả nó là "phạm vi vật phẩm/quả cầu kinh nghiệm gộp trên mặt đất"; còn tài liệu chính thức Paper giải thích exp là "gộp ngay lúc sinh ra, bản gốc không có hành vi này, đặt 0 hoặc nhỏ hơn là tắt".

:::tip Giá trị mặc định không thống nhất chính là lý do bạn phải tra tệp cục bộ
Cùng một khóa có giá trị mặc định khác nhau ở lõi khác nhau, phiên bản khác nhau, là chuyện bình thường của loại tối ưu này. **Tăng bán kính gộp** giúp vật rơi nhanh chồng thành một đống hơn, giảm số thực thể, cái giá là **thay đổi hành vi bản gốc**, có thể ảnh hưởng máy móc phụ thuộc việc tách vật phẩm —— máy chủ kỹ thuật redstone hãy cẩn thận. Khóa liên quan còn có `entities.behavior.experience-merge-max-value` của Paper (hiện mặc định `-1`, tức là không giới hạn giá trị tối đa sau khi gộp quả cầu kinh nghiệm).
:::

**Chặn cuối cho bản lưu**: `chunks.entity-per-chunk-save-limit` của Paper có thể giới hạn số thực thể một loại được **lưu/nạp** mỗi chunk (trong tài liệu Paper `experience_orb: -1` nghĩa là không giới hạn, cũng có thể cấu hình theo `<entity-type>`). Nó giới hạn ở khâu lưu và nạp, không xóa thực thể ngay tại chỗ, phù hợp làm chặn cuối cho tình huống "rơi một đất quả cầu kinh nghiệm".

**Đừng để nông trại chạy khi không có ai**: đừng lạm dụng `/forceload`; `unsupported-settings.disable-world-ticking-when-empty` của Paper (hiện mặc định `false`, thuộc tùy chọn được chính thức ghi rõ là "không được hỗ trợ") có thể dừng tick thế giới khi không có người chơi và cũng không có chunk cưỡng chế nạp —— **xác nhận hành vi theo phiên bản trước khi sửa**.

## 3. Thực thể tích tụ (sinh vật)

### 3.1 Nguyên nhân thường gặp

- **Lồng sinh quái chạy lâu dài**: nhất là lồng chưa làm giết/thu;
- **Hang chưa chiếu sáng và sinh quái ban đêm**: dưới đất quanh vùng người chơi hoạt động toàn quái;
- **Sinh sản không tiết chế**: bò cừu lợn gà chồng thành một đám;
- **Thú cưng khắp nơi**: chó, mèo, ngựa đã thuần nằm rải rác khắp bản đồ;
- **Sảnh sinh sản dân làng**: sau khi dân làng lên hàng trăm, chi phí truy vấn POI và tìm đường tăng rõ rệt;
- **Tích tụ cướp bóc / thương nhân lang thang**: cướp bóc lâu không kết thúc, thương nhân lang thang không ai để ý cùng lạc đà của nó;
- **Thiết bị redstone thực thể dày đặc**: dãy xe mỏ, giá để giáp, chuỗi vật rơi;
- **Cổng dịch chuyển sinh pigman**: Paper cung cấp `nerf-pigmen-from-nether-portals` (hiện mặc định `false`) để tắt hành vi này.

### 3.2 Chẩn đoán

- **spark profiler**: điểm nóng thường ở `Entity.tick`, các phương thức liên quan tìm đường, quét cảm biến, truy vấn POI của dân làng;
- **`/spark health`**: xác nhận trong bốn mục TPS, CPU, bộ nhớ, đĩa thì mục nào đang báo động;
- **`/paper entity list`**: xem phân bố loại thực thể (loại nào số lượng bất thường);
- **`/paper mobcaps`**: xem giới hạn sinh quái toàn cục và mức chiếm thực tế của một thế giới, cùng số chunk có thể sinh quái;
- **`/paper playermobcaps`**: xem giới hạn sinh quái cục bộ của từng người chơi;
- **`/paper chunkinfo`**: đối chiếu số thực thể với tình hình nạp chunk, phán đoán có phải "một chunk cưỡng chế nạp đang sinh quái".

### 3.3 Xử lý

**(1) Phạm vi kích hoạt thực thể**: xem mục 1.5. Đây là mức hiệu quả nhất cũng dễ làm hỏng máy móc nhất, trước khi sửa hãy sao lưu cấu hình, sửa xong chạy lại kiểm tra nông trại.

**(2) Phạm vi sinh quái `mob-spawn-range`**: đơn vị là chunk, kiểm soát quanh người chơi xa bao nhiêu thì có thể sinh quái. Tài liệu chính thức Paper hiện ghi `8`, wiki Spigot ghi `6` —— **lại là một giá trị mặc định thay đổi theo phiên bản**, hãy lấy tệp cục bộ làm chuẩn. Giảm nhỏ có thể giảm tổng số sinh vật sinh ra, nhưng có thể khiến một số tháp sinh quái giảm hiệu suất.

**(3) Giới hạn sinh quái mỗi thế giới**: `spawn-limits` trong `bukkit.yml`, giá trị mặc định tài liệu chính thức Paper hiện liệt kê là:

```yaml
# bukkit.yml
spawn-limits:
  monsters: 70
  animals: 10
  water-animals: 5
  water-ambient: 20
  water-underground-creature: 5
  axolotls: 5
  ambient: 15
```

Paper còn cho phép ghi đè cùng bộ giới hạn này theo thế giới trong `paper-world-defaults.yml` (`entities.spawning.spawn-limits`, hiện mặc định toàn bộ là `-1`, tức là dùng giá trị của `bukkit.yml`). Ngoài ra `entities.spawning.per-player-mob-spawns` (hiện mặc định `true`) quyết định giới hạn sinh quái tính riêng theo từng người chơi hay chia sẻ toàn cục.

**(4) Luật chơi**: có sẵn của bản gốc, hiệu quả nhanh nhất.

```bash
# Tắt sinh quái tự nhiên (bản gốc mặc định true) —— chú ý điều này sẽ làm tháp sinh quái mất hiệu lực
/gamerule doMobSpawning false

# Tắt vật rơi từ sinh vật (bản gốc mặc định true)
/gamerule doMobLoot false

# Tốc độ tick ngẫu nhiên, bản gốc mặc định 3; giảm nhỏ sẽ đồng thời ảnh hưởng sinh trưởng cây trồng, lan lửa, hình thành băng tuyết
/gamerule randomTickSpeed 3
```

:::warn Luật chơi là "cắt một nhát"
Sau khi tắt `doMobSpawning`, `doMobLoot`, **mọi cách chơi phụ thuộc nó đều mất hiệu lực cùng** (tháp sinh quái, nông trại kinh nghiệm, thu đầu lâu wither skeleton v.v.). Nó phù hợp cho máy chủ sự kiện hoặc chữa cháy tạm thời, không phù hợp bật lâu dài làm biện pháp tối ưu.
:::

**(5) Liên quan lồng sinh quái**:

```yaml
# spigot.yml → world-settings.default
nerf-spawner-mobs: false
```

Giải thích của tài liệu Paper về `nerf-spawner-mobs` là "vô hiệu hóa phần lớn AI của sinh vật do lồng sinh quái sinh ra" (hiện mặc định `false`). Đặt `true` tiết kiệm được chi phí AI đáng kể, nhưng hành vi sinh vật do lồng sinh ra sẽ khác rõ rệt. Paper còn có `tick-rates.mob-spawner` (hiện mặc định `1`) kiểm soát tần suất lồng sinh quái tính vùng có thể sinh và sinh thực thể.

**(6) Plugin kiểm soát lồng sinh quái**: không ít plugin có thể giới hạn khoảng cách kích hoạt của lồng, số lượng sinh mỗi phút hoặc yêu cầu có người chơi tại chỗ. Khi chọn cũng phải xác nhận tương thích với lõi, phiên bản, và ưu tiên phương án "có thể quay lui, có thể danh sách trắng".

**(7) Thiết kế nông trại**: phòng giết + vòng khép kín thu + biến mất kịp thời, là cách giải ổn hơn mọi cấu hình. Vật rơi không rơi xuống đất thì số thực thể không mất kiểm soát.

**(8) Thực thể trang trí**: giá để giáp, marker đều là thực thể. `entities.armor-stands.tick` của Paper (hiện mặc định `true`, giải thích chính thức là "tắt đi có thể ngăn giá để giáp tick, khi có nhiều giá để giáp thì tăng hiệu năng") và `entities.markers.tick` (hiện mặc định `true`, chính thức lưu ý có thể ảnh hưởng hành vi khi chúng là người ngồi của thực thể khác) có thể tắt theo nhu cầu.

**(9) Cưỡng chế biến mất**: `entities.spawning.despawn-time.<entity-type>` của Paper (hiện mặc định `disabled`) có thể đặt thời gian biến mất cưỡng chế cho loại thực thể chỉ định; `entities.spawning.despawn-ranges` kiểm soát khoảng cách biến mất ngẫu nhiên (mặc định `default`, tức là dùng quy tắc bản gốc). Hai mục này đều thay đổi hành vi bản gốc, nghĩ rõ trước khi động.

## 4. Thực thể khối và phễu

### 4.1 Vì sao phễu là hung thủ kinh điển

Phễu là **thực thể khối**, khi chunk chứa nó được tick, mỗi tick nó đều có việc phải làm:

- Kiểm tra phía trên có vật rơi hút được không, có vật chứa rút được không;
- Vận chuyển vật phẩm theo thời gian hồi (bản gốc là 8 tick một lần, tương ứng `ticks-per.hopper-transfer` trong `spigot.yml`);
- Truy cập vật chứa phát sinh chi phí thêm, khi plugin lắng nghe sự kiện vận chuyển (InventoryMoveItemEvent) chi phí còn lớn hơn.

Giải thích của tài liệu chính thức Paper về các khóa liên quan trong `spigot.yml` là:

- `ticks-per.hopper-transfer` (hiện mặc định `8`): khoảng tick phễu vận chuyển vật phẩm;
- `ticks-per.hopper-check` (hiện mặc định `1`): khoảng tick phễu kiểm tra rút vật phẩm;
- `hopper-amount` (hiện mặc định `1`): số vật phẩm phễu vận chuyển một lần, tối đa bằng kích thước chồng;
- `hopper-can-load-chunks` (hiện mặc định `false`): công tắc liên quan "phễu có nạp chunk không", ngữ nghĩa và giá trị mặc định hãy lấy tài liệu chính thức và cấu hình cục bộ của bạn làm chuẩn.

Wiki Spigot nhắc thêm: tăng `hopper-check` sẽ **phá hỏng phần lớn thiết bị phễu vì mất đồng bộ**. Tức là loại "tối ưu hiệu năng" này trong bối cảnh kỹ thuật redstone gần như chắc chắn có vấn đề.

```yaml
# spigot.yml → world-settings.default
ticks-per:
  hopper-transfer: 8
  hopper-check: 1
hopper-amount: 1
```

### 4.2 Giảm chi phí phễu thế nào

| Cách làm | Mô tả | Cái giá |
| --- | --- | --- |
| Dùng dòng nước/đường băng thay chuỗi phễu dài | Vật phẩm trôi theo nước, chỉ đặt một phễu thu ở điểm cuối | Cần thiết kế lại logistics |
| Dùng dropper dồn vào một tuyến phễu | Giảm việc lặp "mỗi rương một phễu" | Cần điều khiển redstone |
| Dỡ phễu rảnh | Máy móc bỏ không, tuyến logistics hỏng còn trong thế giới vẫn tick như thường | Không |
| Vận chuyển bằng xe mỏ phễu | Một thực thể thay một tuyến phễu, phù hợp khoảng cách xa | Bản thân xe mỏ cũng là thực thể |
| Bật tối ưu phễu của lõi | Ví dụ mục `hopper` của Paper | Có thể ảnh hưởng plugin phụ thuộc sự kiện vận chuyển |
| Cho phễu đầy làm ít việc hơn | `hopper.cooldown-when-full` của Paper (hiện mặc định `true`) | Không, thuộc tối ưu bật sẵn |

Trong `paper-world-defaults.yml` của Paper có mục phễu riêng:

```yaml
# paper-world-defaults.yml
hopper:
  cooldown-when-full: true
  disable-move-event: false
  ignore-occluding-blocks: false
```

- `cooldown-when-full`: tài liệu Paper giải thích là "phễu đầy thì áp dụng thời gian hồi ngắn, thay vì liên tục thử rút vật phẩm mới";
- `disable-move-event`: tắt sự kiện vận chuyển để tiết kiệm chi phí, nhưng **plugin phụ thuộc sự kiện đó sẽ mất hiệu lực**;
- `ignore-occluding-blocks`: bỏ qua kiểm tra liên quan khối che khuất.

:::note Cấu trúc và giá trị mặc định thay đổi theo phiên bản
Hình dạng đoạn trên đã đổi qua các phiên bản Paper khác nhau (ví dụ `cooldown-when-full` thời đầu là nút con có `enabled` / `movement-ticks`). **Hãy lấy `paper-world-defaults.yml` do máy bạn sinh ra và tài liệu chính thức Paper làm chuẩn.**
:::

### 4.3 Nhân tiện: cập nhật vật chứa và các công tắc "không được hỗ trợ"

`tick-rates.container-update` của Paper (hiện mặc định `1`) kiểm soát tần suất máy chủ cập nhật vật chứa và túi đồ. Tài liệu chính thức Paper cảnh báo rõ: **đặt nó lớn hơn 1 sẽ gây mất đồng bộ/nhân bản vật phẩm (ghosting), hoặc khiến tiến trình đào trông như tự nhiên đặt lại, cũng có thể tạo ra ảo giác thị giác "như lag máy chủ"**. Đây không phải một mục tối ưu đáng động vào.

`unsupported-settings.ticking.block-entities` và `ticking.chunks` của Paper (hiện mặc định đều là `true`, và được chính thức ghi rõ là "không được hỗ trợ") có thể tắt toàn bộ tick thực thể khối hoặc chunk. **Đừng chạm vào chúng trên máy chủ sản xuất** —— đó bằng cách tắt logic game đi.

## 5. Quy trình kiểm tra

Thứ tự kiểm tra lag do thực thể giống các vấn đề hiệu năng khác: **đo trước, định vị sau, cuối cùng mới động tay**.

### 5.1 Bảy bước

1. **Đo**: `/spark tps` xem TPS và MSPT, `/spark health` xem là vấn đề CPU, bộ nhớ hay đĩa. Xác nhận "đúng là luồng chính bị ăn full" rồi mới đi tiếp.
2. **Tìm điểm nóng**: `/spark profiler start --timeout 60`, lấy mẫu xong xem cây gọi —— `Entity.tick`, `ItemEntity.tick`, tick thực thể khối, phương thức tìm đường/cảm biến, nhánh nào rộng nhất là nghi phạm chính. Cách đọc biểu đồ xem [Phân tích hiệu năng bằng spark](/tutorials/ops/spark).
3. **Định vị chunk và loại**: `/paper entity list` xem phân bố loại, `/paper chunkinfo` xem phân bố loại chunk, `/forceload query` tra cưỡng chế nạp.
4. **Phán đoán tính chất**: đây là **vấn đề thiết kế** (nông trại không khép kín, máy móc không ai quản) hay **vấn đề cấu hình** (phạm vi sinh quái, phạm vi kích hoạt quá rộng)? Đại đa số trường hợp là vấn đề thiết kế.
5. **Sửa thiết kế trước**: thêm phòng giết, thêm thu, dỡ máy móc bỏ không, đừng để nông trại chạy qua đêm không người. Sửa xong mới đo.
6. **Rồi mới chỉnh cấu hình**: thiết kế sửa xong vẫn chưa đủ thì mới động vào các mục liên quan thực thể trong `spigot.yml` / `bukkit.yml` / `paper-world-defaults.yml`. **Mỗi lần chỉ đổi một mục**, sao lưu trước khi sửa (xem [Cấu hình máy chủ](/tutorials/java/config)).
7. **Đo lại và ghi sổ**: sửa xong chạy lại ngay cùng bối cảnh (cùng máy, cùng khung giờ, cùng số người), xác nhận MSPT thật sự giảm; ghi "đã đổi gì, vì sao, hiệu quả thế nào" vào nhật ký thay đổi. **Tối ưu mà không đo lại thì bằng không làm.**

### 5.2 Bảng tra nhanh

| Hiện tượng | Nguyên nhân có thể | Kiểm tra gì trước | Xử lý |
| --- | --- | --- | --- |
| Trên đất đâu cũng có vật rơi, TPS trượt chậm | Nông trại không có vòng khép kín thu, chuỗi phễu đứt, người chơi vứt bừa | `/paper entity list minecraft:item`, cây gọi spark | Sửa thiết kế nông trại; plugin dọn định kỳ làm chặn cuối |
| Đến một vùng là lag, rời đi thì hết | Chunk đó có nhiều thực thể hoặc máy móc dày đặc | `/paper chunkinfo`, `/forceload query`, spark so sánh theo thế giới/vùng | Dỡ sửa máy móc; bỏ cưỡng chế nạp không cần thiết |
| Ban đêm/dưới đất sinh quái xong bắt đầu lag | Vùng chưa chiếu sáng sinh quái | `/paper entity list`, `/paper mobcaps` | Chiếu sáng hang; thu nhỏ `mob-spawn-range`; khi cần thì `doMobSpawning` |
| Gần sảnh dân làng lag | Số dân làng lớn, chi phí truy vấn POI và tìm đường | Điểm nóng liên quan dân làng trong spark, `/paper entity list minecraft:villager` | Giới hạn sinh sản; khi cần thì tắt `tick-inactive-villagers` (sẽ thay đổi hành vi bản gốc) |
| Nhiều máy móc rảnh cũng lag | Phễu, lồng sinh quái, giá để giáp và các thực thể khối/thực thể chạy không tải | Tỷ lệ tick thực thể khối và thực thể trong spark | Dỡ máy rảnh; bật tối ưu phễu của lõi; tắt tick giá để giáp |
| Khởi động lại xong bình thường một lúc, rồi lại lag | Nguồn phát sinh chưa được xử lý | Quan sát thời gian cần để hồi phục, đối chiếu phần kiểm tra trên | Quay lại bước 1~5, xử lý nguồn phát sinh chứ đừng khởi động lại lặp lại |
| Cấp rất nhiều bộ nhớ vẫn lag | Điểm nghẽn ở CPU luồng chính, không phải bộ nhớ heap | CPU và MSPT trong `/spark health` | Xử lý thực thể theo bài này; xem [Tối ưu hiệu năng](/tutorials/java/optimize) |
| Cài plugin dọn rồi vẫn lag | Đối tượng/khoảng cách dọn không đúng, hoặc điểm lag hoàn toàn không phải vật rơi | Cây gọi spark | Xác nhận điểm nóng trước, rồi mới quyết định có giữ plugin đó không |

Tra nhanh triệu chứng các loại báo lỗi và cái bẫy của Java Edition xem [[JAVA] Câu hỏi thường gặp](/tutorials/faq/faq-java).

## 6. Hiểu lầm thường gặp

**Hiểu lầm một: khởi động lại là giải quyết được.**
Khởi động lại chỉ nạp lại thế giới một lần, thời gian ngắn trông "mượt rồi". Chỉ cần tháp sinh quái còn ném đồ xuống đất, chuỗi phễu còn đứt, chunk cưỡng chế nạp còn bật, tích tụ sẽ quay lại với tốc độ như cũ. Khởi động lại là **biện pháp cấp cứu**, không phải biện pháp sửa chữa.

**Hiểu lầm hai: thêm bộ nhớ (`-Xmx`) chữa được lag thực thể.**
Lag thực thể là vấn đề **CPU luồng chính**, không phải bộ nhớ heap. Cấp bao nhiêu thì tick vẫn chạy trên luồng đó; `-Xmx` quá lớn còn khiến GC dừng lâu hơn. Trước tiên hãy tìm điểm nóng ra.

**Hiểu lầm ba: giới hạn thực thể chỉnh càng mạnh càng tốt.**
Thu mạnh phạm vi kích hoạt, phạm vi sinh quái, bán kính gộp sẽ khiến **nông trại và máy kỹ thuật redstone mất hiệu lực luôn**: dân làng không bổ hàng, tháp sinh quái không ra hàng, thiết bị phụ thuộc tách vật phẩm rối loạn. Máy chủ kỹ thuật redstone hãy xem trước [Kỹ thuật redstone và redstone](/tutorials/java/redstone), khi cần thì đổi sang Fabric / Leaves, chứ đừng sửa hành vi trong hệ Paper đến mức không nhận ra.

**Hiểu lầm bốn: `/kill @e` là thuốc vạn năng.**
Nó sẽ dọn cả thú cưng người chơi đã thuần, giá để giáp có trang bị, sản phẩm đang thu, **không thể hoàn tác**. `/kill @e[type=item]` tuy nhẹ hơn, vẫn sẽ dọn vật phẩm hợp pháp của người chơi và nông trại trên đất. Trước khi chạy hãy nghĩ rõ "trong các thực thể này có tài sản của người chơi không".

**Hiểu lầm năm: số thực thể nhiều là bằng lag.**
Số lượng phải xem loại và vị trí. Một vạn vật rơi chồng trong một chunk, bên cạnh còn có người chơi, đó là thảm họa; một vạn vật rơi rải trong một trăm chunk chỉ Block Ticking, có thể gần như không phát sinh chi phí. **Xem điểm nóng tick trước, xem số lượng sau.**

**Hiểu lầm sáu: cài một mớ "plugin tối ưu" là giải quyết được.**
Plugin tối ưu phần lớn chỉ bọc các mục cấu hình trên thành giao diện đồ họa hoặc tác vụ định kỳ. **Nguồn phát sinh không giải quyết, dọn chỉ biến vấn đề từ "lag liên tục" thành "lag theo chu kỳ".** Tương thích plugin và lõi cũng phải xác nhận, plugin kém chất lượng bản thân có thể chính là điểm nóng.

**Hiểu lầm bảy: tối ưu một lần là xong.**
Máy chủ là thứ sống: máy mới, nông trại mới, người chơi mới đều thay đổi tải. Đưa các chỉ số then chốt (TPS/MSPT, bậc số lượng thực thể) vào kiểm tra hằng ngày, hữu ích hơn nhiều so với chỉnh tham số một lần.

---

> Tên mục cấu hình và giá trị mặc định thay đổi theo lõi và phiên bản, hãy lấy tệp cấu hình do máy bạn sinh ra và tài liệu chính thức làm chuẩn.
