---
title: "Kỹ thuật redstone và máy móc nâng cao: máy, cài đặt và thiết kế máy chủ"
slug: redstone-advanced
cat: java
level: 3
order: 27
minutes: 18
tags: [java, kỹ thuật redstone, redstone, tháp sinh quái, nạp chunk, cài đặt máy chủ, hiệu năng]
updated: 2026-10-04
draft: false
---

Đây là bài nâng cao của [Kỹ thuật redstone và máy móc](/tutorials/java/redstone). Bài nhập môn trả lời "nên chọn lõi nào", bài này trả lời ba câu hỏi thực tế hơn: **người chơi kỹ thuật rốt cuộc đang chế tạo cái gì, những máy đó phụ thuộc cài đặt máy chủ nào, và là chủ máy chủ bạn phải chuẩn bị trước những gì.**

Nói rõ ranh giới của bài trước: ở đây **không đưa bản vẽ máy, cũng không bảo đảm bất kỳ thiết kế cụ thể nào đúng trên phiên bản của bạn**. Sự thật cơ bản nhất của kỹ thuật redstone là —— **tính dùng được của máy gắn với phiên bản game cụ thể và cách hiện thực máy chủ cụ thể**. Mọi câu "cái máy này dùng được vĩnh viễn" đều không đáng tin.

## 1. Người chơi kỹ thuật rốt cuộc đang chế tạo gì

Cái mà người chơi kỹ thuật gọi là "farm" (nông trại) là **dây chuyền tài nguyên tự động hoặc bán tự động**: dùng cơ chế game đổi lấy sản lượng, chứ không đào bằng tay. Hãy lập một bản đồ phân loại trước, rồi mới nói đến tải.

| Loại | Điểm chính cơ chế | Tải chính | Độ nhạy phiên bản |
| --- | --- | --- | --- |
| Tháp sinh quái / farm rơi đồ | Dùng sinh quái tự nhiên hoặc lồng sinh quái, dồn quái lại rồi giết | Số lượng thực thể, AI tìm đường, vật rơi và cầu kinh nghiệm, nạp chunk thường trực | Trung bình: quy tắc sinh quái, AI quái, thay đổi hitbox đều ảnh hưởng hiệu suất |
| Farm vật phẩm | Dựa vào hành vi của chính khối để sinh sản (mía, tre, xương rồng, tảo biển, mật ong, len…) | Cập nhật khối, tick ngẫu nhiên, phễu và xe mỏ thu gom | Trung bình thấp, nhưng phễu ở đầu thu gom tự nó là tải |
| Farm sắt | Dùng cơ chế dọa nạt của dân làng (hoặc cơ chế raid) để kích hoạt sinh iron golem | AI dân làng, truy vấn khối điểm làm việc (POI), sinh thực thể, nạp thường trực | Cao: điều kiện sinh dân làng và iron golem bị điều chỉnh nhiều lần |
| Farm vàng | Dùng cổng Nether sinh zombie piglin (từ 1.16 đổi tên từ "zombie pigman") rồi dồn giết | Khối thực thể cổng, số lượng thực thể, nạp thường trực chunk Nether | Cao: đổi tên thực thể, điều chỉnh AI, thay đổi cơ chế cổng đều ảnh hưởng cách sinh sản |
| Sảnh giao dịch dân làng | Nhiều dân làng đi với khối điểm làm việc, làm mới và khóa giao dịch | AI dân làng, POI, tìm đường, nạp chunk thường trực | Trung bình cao: cơ chế giao dịch và nghề bị điều chỉnh nhiều lần |
| Farm raid | Kích hoạt raid và xử lý từng đợt, lấy ngọc lục bảo, totem bất tử… | Thực thể sinh theo đợt, AI, vật rơi | Cao |
| Farm wither skeleton | Sinh quái trong pháo đài Nether, phối hợp snow golem hoặc hoa wither để giết | Nạp thường trực chunk pháo đài, thực thể, vật rơi | Trung bình cao |
| Farm cây / farm thức ăn | Tự động trồng và thu hoạch (piston hoặc TNT), cùng các farm cây trồng | Tick ngẫu nhiên, cập nhật khối, thực thể TNT, vật rơi | Trung bình |
| Farm nhân bản TNT và farm cơ chế khác | Dùng đặc tính nhân bản để có tài nguyên vốn đắt như TNT; dùng cơ chế piston, khối trọng lực, cổng… | Thực thể TNT và nổ, lượng cập nhật khối khổng lồ, dễ trực tiếp đè sụp TPS | Rất cao: loại đặc tính này bị sửa rồi lại xuất hiện, và nhiều máy chủ cấm rõ ràng |

Phân loại theo "tải" chứ không theo "sản lượng", vì **với chủ máy chủ, sản lượng của máy thuộc về người chơi, chi phí của máy thuộc về máy chủ**. Dưới đây nói từng loại.

### 1.1 Tháp sinh quái và farm rơi đồ

- **Cơ chế**: hoặc để quái sinh tự nhiên trong vùng tối rồi dồn lại, hoặc dùng lồng sinh quái sinh liên tục. Cách dồn thường là dòng nước, piston đẩy, hoặc dẫn quái sang chiều khác.
- **Tải**: quái là "thực thể biết suy nghĩ", mỗi tick đều phải làm AI, tìm đường và phán định va chạm; vật rơi và cầu kinh nghiệm còn tiếp tục chiếm hạn mức thực thể.
- **Chủ máy chủ cần chú ý**: đây là loại máy dễ làm máy chủ chậm nhất, vì nó đồng thời tiêu bốn loại chi phí: thực thể, AI, chunk và vật rơi.

### 1.2 Farm vật phẩm

- **Cơ chế**: không dựa vào sinh quái, dựa vào hành vi của chính khối để sinh sản, ví dụ mía, tre, xương rồng, tảo biển, mật ong, len.
- **Tải**: chủ yếu là cập nhật khối và tick ngẫu nhiên, sản phẩm cần thu bằng phễu hoặc xe mỏ, **đầu thu gom thường đắt hơn đầu sản xuất**.
- **Chủ máy chủ cần chú ý**: giảm `randomTickSpeed` sẽ trực tiếp làm loại farm này chậm lại; tăng khoảng cách vận chuyển của phễu (`hopper-transfer`) sẽ làm mọi hệ thống thu gom chậm lại.

### 1.3 Farm sắt

- **Cơ chế**: dùng dân làng và điều kiện "dọa nạt" để kích hoạt sinh iron golem, cũng có biến thể dựa trên cơ chế raid.
- **Tải**: AI dân làng và truy vấn khối điểm làm việc nổi tiếng là đắt, cộng thêm chunk phải nạp thường trực.
- **Chú ý phiên bản**: điều kiện sinh iron golem, phán định làm việc và ngủ của dân làng đã đổi nhiều lần, **loại máy này gần như mỗi lần cập nhật phiên bản lớn đều phải kiểm chứng lại**.

### 1.4 Farm vàng

- **Cơ chế**: dùng cổng Nether sinh zombie piglin (từ 1.16 zombie pigman đổi tên thành zombie piglin) rồi dồn giết.
- **Tải**: khối thực thể cổng, lượng lớn thực thể và vật rơi, và phải để chunk Nether nạp thường trực.
- **Chú ý phiên bản**: đổi tên thực thể, điều chỉnh AI, thay đổi cơ chế cổng đều ảnh hưởng cách sinh sản.

### 1.5 Sảnh giao dịch dân làng

- **Cơ chế**: nhốt nhiều dân làng cùng chỗ, đi với khối điểm làm việc để làm mới giao dịch, đến khi có giao dịch muốn thì khóa lại.
- **Tải**: dân làng là một trong những thực thể thường gặp "nặng" nhất trên máy chủ, tìm đường, truy vấn POI, hành vi mỗi tick đều phải tính.
- **Chủ máy chủ cần chú ý**: sảnh giao dịch thường nối với farm sắt, máy nhân giống, tạo thành một mảng tải cao nhỏ; các mục tối ưu kiểu `tick-inactive-villagers` sẽ trực tiếp thay đổi hành vi dân làng.

### 1.6 Farm raid

- **Cơ chế**: chủ động kích hoạt raid và xử lý từng đợt kẻ tấn công sinh ra, đổi lấy ngọc lục bảo, totem bất tử…
- **Tải**: sinh theo đợt sẽ tạo lượng lớn thực thể trong thời gian ngắn, thuộc tải **dạng đột biến**, dễ gây đỉnh MSPT chứ không phải tăng đều.
- **Chú ý phiên bản**: điều kiện kích hoạt raid, thành phần từng đợt và bảng rơi đồ đều đã đổi.

### 1.7 Farm wither skeleton

- **Cơ chế**: sinh quái trong phạm vi pháo đài Nether, rồi dùng biện pháp tự động để giết và thu gom.
- **Tải**: chunk pháo đài phải nạp thường trực, thực thể và vật rơi tồn tại liên tục.
- **Chủ máy chủ cần chú ý**: phạm vi kết cấu pháo đài có hạn, nhiều người chơi cùng xây farm sẽ tranh hạn mức sinh quái của nhau.

### 1.8 Farm cây và farm thức ăn

- **Cơ chế**: tự động trồng và thu hoạch (piston hoặc TNT), cùng farm cây trồng như lúa mì, cà rốt, khoai tây.
- **Tải**: tick ngẫu nhiên, cập nhật khối, thực thể TNT và nổ.
- **Chủ máy chủ cần chú ý**: vụ nổ của farm cây kiểu TNT mang lại lượng lớn cập nhật khối, là nguồn **lag cục bộ** thường gặp.

### 1.9 Farm nhân bản TNT và farm cơ chế khác

- **Cơ chế**: dùng đặc tính nhân bản trong game để có tài nguyên vốn đắt như TNT; hoặc dùng hành vi biên của cơ chế piston, khối trọng lực, cổng…
- **Tải**: thực thể TNT và nổ, cập nhật khối từng mảng, một thiết bị nhân bản quy mô lớn đủ để TPS rơi xuống một chữ số.
- **Chủ máy chủ cần chú ý**: loại đặc tính này **bị chính thức sửa rồi lại xuất hiện**, hành vi cụ thể gắn hoàn toàn với phiên bản; đồng thời **nhiều máy chủ cấm rõ trong nội quy**, vì nó vừa là vấn đề hiệu năng vừa là vấn đề công bằng. Có cho phép hay không phải viết rõ trong nội quy.

:::warn Đừng tưởng một thiết kế nào đó là "phổ quát"
Cùng một cái máy trên các phiên bản game khác nhau có thể mất hiệu lực hoàn toàn, nguyên nhân có thể là quy tắc sinh quái, AI thực thể, thứ tự cập nhật khối, một đặc tính nhân bản bị sửa, thậm chí chỉ là hitbox đổi 0.1 ô. Nên:

- Khi người chơi nói "máy này dùng được", hỏi rõ **phiên bản game** và **lõi máy chủ** trước;
- Khi chủ máy chủ nói "chúng ta nâng lên phiên bản mới", tức là tuyên bố **mọi máy đều phải kiểm chứng lại**;
- Thiết kế trong bất kỳ hướng dẫn nào (kể cả bài này) chỉ coi được là "ý tưởng", không phải "bảo đảm".
:::

## 2. Một cái máy mang lại gì cho máy chủ

Tách máy thành sáu loại chi phí thì mới có hướng khi tìm lỗi:

| Loại chi phí | Sinh ra từ đâu | Biểu hiện điển hình |
| --- | --- | --- |
| Số lượng thực thể | Quái, vật rơi, cầu kinh nghiệm, xe mỏ, giá để giáp, TNT | MSPT tăng, đồng bộ thực thể chiếm băng thông |
| AI và tìm đường | Suy nghĩ mỗi tick của quái và dân làng, tính đường đi | Rõ nhất ở vùng nhiều dân làng, TPS tụt mà khó định vị |
| Nạp chunk | Chunk nạp thường trực, bộ nạp cổng | Không có người vẫn liên tục ăn CPU và bộ nhớ |
| Cập nhật khối và điều phối redstone | Linh kiện redstone, phễu, piston, observer | Clock tần suất cao và redstone diện rộng là sát thủ kinh điển |
| Tick ngẫu nhiên | Cây trồng, lá, sương giá, lửa | Sau khi tăng `randomTickSpeed`, CPU tăng tuyến tính |
| Ánh sáng và bản lưu | Thay đổi khối kích hoạt tính lại ánh sáng; chunk tự động lưu định kỳ | Cải tạo diện rộng thì xuất hiện lag có quy luật |

Kết luận chỉ một câu: **TPS là kết quả cộng dồn của những chi phí này, không do một công tắc nào quyết định.**

### 2.1 Định lượng chi phí thế nào

Đừng phán đoán "máy này đắt hay không" bằng cảm giác, hãy đo theo thứ tự dưới đây:

```text
1. Ghi lại đường cơ sở: TPS / MSPT khi không có người chơi online
2. Chỉ để một người chơi đứng cạnh máy, quan sát đường MSPT 5-10 phút
3. Tắt máy đo lại một lần, chênh lệch hai lần chính là chi phí của máy này
4. Lấy mẫu bằng spark, xác nhận chi phí rơi vào thực thể, khối thực thể hay chunk
5. Ghi con số lại, lần sau nâng phiên bản hoặc đổi cấu hình dùng cùng cách đo lại
```

Giá trị của việc này là: khi người chơi nói "máy chủ lag mới làm máy không chạy", bạn có dữ liệu trong tay để phán đoán, chứ không phải đoán nhau.

## 3. Cài đặt máy chủ mà kỹ thuật redstone phụ thuộc

Nguyên tắc đặt ở đây trước: **hành vi bản gốc là "giá trị mặc định", tối ưu là "lệch khỏi giá trị mặc định".** Người chơi kỹ thuật cần cái trước.

Tên khóa, giá trị mặc định và giá trị tùy chọn dưới đây **đều thay đổi theo phiên bản**, cũng có thể không tồn tại vì nhánh lõi bạn dùng khác. Xin lấy **tệp cấu hình của chính máy chủ bạn** và tài liệu chính thức của lõi đó làm chuẩn, bài này chỉ nói "mục này để làm gì, đổi thì xảy ra gì".

### 3.1 Hạn mức sinh quái (mob cap)

Hạn mức sinh quái của bản gốc **không phải con số cố định**, mà co giãn theo người chơi và theo số chunk có thể sinh quái. Điểm chính:

- Hạn mức co giãn theo **số người chơi** và **số chunk có thể sinh quái quanh người chơi**, nên "máy chủ đông người thì sinh quái nhiều hơn" là hiện tượng bình thường;
- Quái, động vật, sinh vật nước, sinh vật môi trường mỗi loại có hạn mức riêng;
- Hạn mức tính theo người chơi, nên **khi không có người chơi online thì không sinh quái tự nhiên** —— dù chunk đó được nạp thường trực;
- `spawn-limits` phía plugin (`bukkit.yml`) sẽ ghi đè thuật toán này, đổi "co giãn theo người chơi" thành cách tính khác. Các nhánh lõi khác nhau hiện thực khác nhau, đổi nó sẽ trực tiếp thay đổi sản lượng của mọi tháp sinh quái.

### 3.2 Phạm vi sinh quái và khoảng cách biến mất

- Quái bản gốc sinh trong khoảng cách nhất định quanh người chơi (có khoảng cách nhỏ nhất và lớn nhất), xa người chơi quá sẽ biến mất.
- `mob-spawn-range` (`spigot.yml`, đơn vị là chunk) sẽ đổi phạm vi này.
- Phản ứng dây chuyền khi đổi: hiệu suất tháp sinh quái, tốc độ quái biến mất, phạm vi kích hoạt cơ chế liên quan đến làng và raid đều thay đổi.
- Máy chủ kỹ thuật redstone thường **giữ phạm vi bản gốc**, vì mọi thiết kế chín đều làm quanh khoảng cách bản gốc.

### 3.3 Phạm vi kích hoạt thực thể (entity activation range)

- `entity-activation-range` của Spigot sẽ làm thực thể ở xa **giảm tần suất thậm chí ngừng tick**, giá trị mặc định đại khái từ hơn mười ô đến hơn bốn mươi ô (cụ thể theo `spigot.yml` của bạn).
- Hậu quả rất trực tiếp: nửa "xa người chơi" trong máy không chạy, hoặc tốc độ chạy không khớp bản gốc.
- Máy chủ kỹ thuật redstone hoặc chỉnh nó đủ lớn, hoặc chấp nhận "một phần máy có hành vi khác bản gốc".
- Chú ý: mục này với máy chủ sinh tồn thường là tối ưu **lợi ích rất cao**, nên nhiều cấu hình đặt sẵn ép nó rất thấp, xung đột nằm ở đây.

### 3.4 Tick ngẫu nhiên

- `randomTickSpeed` là game rule, giá trị mặc định bản gốc là 3.
- Phạm vi ảnh hưởng: cây trồng lớn, lá mục, sương giá hình thành và tan, lửa lan.
- Tăng lên làm farm dựa vào tick ngẫu nhiên nhanh hơn, đồng thời **tăng mạnh** chi phí CPU; giảm thì ngược lại.
- Nhiều hướng dẫn "tối ưu" khuyên giảm nó —— tức là **đã đổi hành vi bản gốc**, máy loại cây trồng sẽ chậm theo.

### 3.5 Liên quan redstone

- Lõi họ Paper cung cấp **cách hiện thực redstone** có thể chuyển đổi (mục cấu hình nằm trong cấu hình mặc định của thế giới, kiểu `misc.redstone-implementation`, đường dẫn khóa và giá trị tùy chọn thay đổi theo phiên bản).
- Máy chủ kỹ thuật redstone **bắt buộc giữ cách hiện thực vanilla**. Đổi sang cách đã tối ưu vì hiệu năng sẽ thay đổi hành vi cập nhật redstone, máy có thể mất hiệu lực thẳng.
- Ngoài ra chú ý: một số mục tối ưu điều chỉnh thứ tự cập nhật khối hoặc độ trễ điều phối redstone, loại thay đổi này chí mạng hơn "hiệu năng giảm", vì nó làm máy hỏng **một cách lặng lẽ**.

### 3.6 Các mục hay bị đổi khác

| Cài đặt | Hành vi bản gốc | Cách "tối ưu" thường gặp | Đánh đổi của kỹ thuật redstone |
| --- | --- | --- | --- |
| `simulation-distance` (`server.properties`) | Chunk trong khoảng cách đó được tính toán thật | Giảm xuống 4-6 | Ảnh hưởng phạm vi dùng được của mọi máy, giảm xuống tức là chặt bỏ máy ở xa |
| `view-distance` | Người chơi nhìn được xa bao nhiêu | Giảm | Chỉ ảnh hưởng cảm giác nhìn và băng thông, ảnh hưởng máy móc ít |
| `entity-broadcast-range-percentage` | Tỉ lệ phạm vi đồng bộ thực thể cho người chơi | Giảm | Người chơi sẽ thấy thực thể "đột nhiên xuất hiện", nhưng không ảnh hưởng tính toán phía máy chủ |
| `entity-tracking-range` (`spigot.yml`) | Khoảng cách thực thể được theo dõi | Giảm | Chỉ ảnh hưởng đồng bộ, không đổi logic máy |
| `max-entity-collisions` | Vượt hạn mức thì ngừng xử lý va chạm thực thể | Giảm | Máy nhiều thực thể dày đặc cần tăng lên, cái giá là hiệu năng |
| `nerf-spawner-mobs` | Quái do lồng sinh quái sinh ra có AI đầy đủ | Đặt `true` để làm yếu AI | Sẽ làm cách sinh sản của farm lồng sinh quái thay đổi |
| `hopper-transfer` / `hopper-check` (`ticks-per`) | Phễu vận chuyển mỗi 8 tick một lần | Tăng để tiết kiệm hiệu năng | **Trực tiếp thay đổi sản lượng của mọi phễu**, thứ tự thời gian của máy đổi hết |
| `merge-radius` (`spigot.yml`) | Bán kính gộp vật rơi và cầu kinh nghiệm | Tăng | Giảm số lượng thực thể, nhưng đổi hành vi gộp của bản gốc |
| `randomTickSpeed` | 3 | Giảm | Farm loại cây trồng chậm lại |
| Các game rule như `doMobSpawning` | Xem mô tả `/gamerule` trong game | Tắt để giảm tải | Tắt là không còn tháp sinh quái |

### 3.7 Các cài đặt này trông thế nào

Dưới đây chỉ là **minh họa**, để bạn nhận biết vị trí và hình dạng của các khóa này trong tệp; **con số không phải đáp án để chép**, hãy đối chiếu tệp trên máy bạn.

```yaml
# spigot.yml (minh họa, tên khóa và giá trị mặc định thay đổi theo phiên bản)
world-settings:
  default:
    mob-spawn-range: 8
    entity-activation-range:
      animals: 32
      monsters: 32
      raiders: 48
      misc: 16
      water: 16
      villagers: 32
      flying-monsters: 48
    max-entity-collisions: 8
    nerf-spawner-mobs: false
    merge-radius:
      item: 2.5
      exp: 3.0
    ticks-per:
      hopper-transfer: 8
      hopper-check: 8
```

```yaml
# bukkit.yml (minh họa, giá trị mặc định thay đổi theo phiên bản)
spawn-limits:
  monsters: 70
  animals: 10
  water-animals: 15
  water-ambient: 20
  ambient: 15
ticks-per:
  monster-spawns: 1
  animal-spawns: 400
  autosave: 6000
```

```text
# server.properties (minh họa)
simulation-distance=10
view-distance=10
entity-broadcast-range-percentage=100
```

```bash
# game rule: đây là giá trị mặc định bản gốc, trước khi đổi hãy nghĩ rõ sẽ phá cái gì
/gamerule randomTickSpeed 3
/gamerule doMobSpawning true
/gamerule doFireTick true
/gamerule doInsomnia true
/gamerule doPatrolSpawning true
/gamerule doTraderSpawning true
/gamerule disableRaids false
/gamerule mobGriefing true
```

:::warn Nhiều plugin "tối ưu" đổi chính là hành vi bản gốc
Trên thị trường có rất nhiều plugin "tối ưu hiệu năng" và cấu hình đặt sẵn, cách làm là ép những giá trị trên về mức cực đoan hơn bản gốc nhiều: thu nhỏ phạm vi kích hoạt thực thể, giảm tick ngẫu nhiên, gộp thực thể, viết lại điều phối redstone, giới hạn hạn mức sinh quái. Với máy chủ sinh tồn thường đây là việc tốt, **với máy chủ kỹ thuật redstone là tai họa** —— máy sẽ mất hiệu lực theo cách khó tìm ra, và thường không phải "đứng hoàn toàn", mà là "thỉnh thoảng ra ít hơn một chút".

Nên:

- Trước khi cài bất kỳ plugin tối ưu nào, xác nhận nó **đổi những hành vi bản gốc nào**, tốt nhất chạy một máy đã biết trên máy chủ kiểm thử để kiểm chứng;
- Mục tối ưu và nhu cầu kỹ thuật redstone là đánh đổi lẫn nhau, đừng mong kéo cả hai lên tối đa, xem [Tối ưu hiệu năng](/tutorials/java/optimize);
- Nếu triệu chứng là "thực thể và vật rơi chất đống không dọn", đó là vấn đề tích tụ chứ không phải cấu hình, xem [Lag do thực thể và vật rơi tích tụ](/tutorials/faq/entity-lag).
:::

## 4. Nạp chunk

Nạp chunk là phần dễ bị bỏ qua nhất, cũng dễ bị người chơi lạm dụng nhất trên máy chủ kỹ thuật redstone.

### 4.1 Chunk điểm hồi sinh

- Chunk quanh điểm hồi sinh của thế giới được game **giữ nạp liên tục**, kể cả khi không có người chơi online. Đây là lý do "farm treo máy ở điểm hồi sinh" chạy được 24 giờ.
- Chú ý phân biệt "nạp" và "sinh quái": **không có người chơi online thì không sinh quái tự nhiên**, nhưng redstone, khối thực thể, tick ngẫu nhiên của cây trồng vẫn tiếp tục chạy.
- **Kích thước phạm vi** chunk điểm hồi sinh **đã đổi giữa các phiên bản**, phiên bản mới hơn còn cung cấp game rule điều khiển nó (kiểu `spawnChunkRadius`). Phạm vi cụ thể và tên rule xin tra wiki chính thức của phiên bản tương ứng, đừng chép hướng dẫn cũ.
- Gợi ý thực hành: **đừng xây máy quan trọng nhất ở điểm hồi sinh**, nếu không nó sẽ tiêu tài nguyên 24 giờ mà bạn không biết.

### 4.2 `/forceload`

Lệnh nạp cưỡng bức do bản gốc cung cấp, cũng là chỗ nắm trực tiếp nhất khi chủ máy chủ kiểm toán:

```bash
/forceload add <x-đầu> <z-đầu> [x-cuối z-cuối]
/forceload remove <x-đầu> <z-đầu> [x-cuối z-cuối]
/forceload remove all
/forceload query
/forceload query <x> <z>
```

Điểm chính:

- Tọa độ là **tọa độ khối**, thứ được nạp là chunk chứa các tọa độ đó;
- Số chunk một lệnh nạp được có hạn mức (**tối đa 256 chunk**);
- Danh sách nạp cưỡng bức **được lưu cùng bản lưu**, khởi động lại vẫn có hiệu lực;
- Cần cấp quyền quản trị (thường là OP cấp hai);
- Chunk bị nạp cưỡng bức được **tính toán đầy đủ**, không phải "chỉ nạp không tính".

### 4.3 Bộ nạp chunk kiểu cổng

- "Bộ nạp chunk" người chơi hay dùng phần lớn dựa trên cổng Nether: cổng sẽ giữ **chunk tương ứng ở chiều kia** được nạp trong một khoảng thời gian.
- Cách dùng điển hình là "đặt một cổng ở Nether để máy ở thế giới chính tiếp tục chạy", hoặc ngược lại.
- **Giữ bao lâu, dùng ticket cấp nào là phụ thuộc phiên bản**, xin lấy mô tả cơ chế của phiên bản tương ứng làm chuẩn; điều này cũng nghĩa là một bộ nạp sau khi nâng cấp có thể mất hiệu lực hoặc thành "nạp vĩnh viễn".
- Góc nhìn chủ máy chủ: loại thiết bị này **không xuất hiện trong `/forceload query`**, chỉ còn cách kiểm tra thủ công.

### 4.4 Cái giá của chunk nạp thường trực

| Cái giá | Giải thích |
| --- | --- |
| Bộ nhớ | Dữ liệu và thực thể của mỗi chunk đã nạp đều thường trú trong bộ nhớ, nạp càng nhiều, heap chiếm càng cao, áp lực GC càng lớn |
| CPU | Chunk được nạp sẽ đi qua toàn bộ quy trình tick: khối thực thể, tick ngẫu nhiên, tick thực thể |
| Hạn mức sinh quái | Nếu quanh vùng nạp có người chơi, các chunk này sẽ **chia phần** hạn mức sinh quái, làm sản lượng farm chỗ khác giảm |
| Bản lưu | Chunk đang nạp được tự động lưu định kỳ, vùng nạp thường trực càng lớn, độ giật của tự động lưu càng rõ |
| Tính ẩn | Bộ nạp thường xây ở chỗ người chơi không thấy (Nether, dưới đất), có sự cố khó định vị nhất |

### 4.5 Kiểm toán thế nào

1. **Chạy `/forceload query` từng chiều**: thế giới chính, Nether, End đều phải tra, bộ nạp thường nằm ở hai chiều kia.
2. **Truy bộ nạp kiểu cổng**: hỏi người chơi, xem vị trí cổng Nether, để ý "sao ở đây có một cái cổng lẻ loi".
3. **Xem MSPT khi không có người**: người chơi offline hết mà TPS/MSPT vẫn không khỏe, cơ bản là chunk nạp thường trực đang chạy.
4. **Dùng công cụ phân tích hiệu năng định vị**: kết quả lấy mẫu của công cụ kiểu spark cho biết thời gian tiêu ở chunk và thực thể nào, cách làm giống [Tối ưu hiệu năng](/tutorials/java/optimize).
5. **Viết kết luận vào nội quy**: ai xây bộ nạp, nạp phạm vi bao lớn, dùng để chạy gì, đăng ký lại, trước khi nâng phiên bản kiểm chứng từng cái.

## 5. Mô hình tick mà người chơi kỹ thuật buộc phải hiểu

### 5.1 20 TPS và 50 mili giây

- Mục tiêu bản gốc là **20 TPS**, tức mỗi game tick **50 mili giây**.
- Một tick quá thời gian không làm TPS tụt ngay: thỉnh thoảng một tick 200 mili giây, tính trung bình TPS vẫn gần 20, nhưng người chơi sẽ thấy một lần lag. Thứ thực sự làm TPS tụt là **vượt hạn mức liên tục**.
- Mọi cơ chế phụ thuộc thời gian (cây trồng, lò nung, redstone, di chuyển sinh vật) đều tiến trong vòng lặp này, nên TPS vừa tụt là **mọi thứ chậm cùng lúc**.
- Đây cũng là lý do "TPS 15" cảm giác chậm hơn 25% rất nhiều: mọi máy đều chậm theo cùng một tỉ lệ, thiết kế dựa vào thứ tự thời gian chính xác sẽ đứng hẳn.

### 5.2 Game tick và redstone tick

| Đơn vị | Độ dài | Công dụng |
| --- | --- | --- |
| Game tick | 1/20 giây = 50 mili giây | Đơn vị nhỏ nhất của vòng lặp chính phía máy chủ |
| Redstone tick | 2 game tick = 0,1 giây | Đơn vị cộng đồng dùng để mô tả độ trễ của linh kiện redstone, độ trễ của repeater, observer… đều tính bằng nó |

Một ví dụ nhỏ nhất:

```text
Tick 0 (0 ms)     Repeater được kích hoạt, hẹn "xuất sau 2 tick"
Tick 1 (50 ms)    Các cập nhật khác trên mạch tiếp tục tính trong cùng tick
Tick 2 (100 ms)   Repeater xuất, tức là sau 1 redstone tick
```

Điểm then chốt cần hiểu: **redstone tick là "đơn vị đo độ trễ", không phải "đơn vị thực thi tính toán"**. Cập nhật khối trong cùng một game tick có thể lan tức thời dọc mạch, nên hành vi của máy thường phụ thuộc **thứ tự cập nhật trong cùng tick**, không chỉ con số độ trễ.

### 5.3 Vì sao thứ tự cập nhật là điểm chí mạng

- Khi hai linh kiện ảnh hưởng lẫn nhau trong cùng tick, ai trước ai sau quyết định trạng thái cuối.
- Đây chính là nguyên nhân gốc của "đổi lõi máy chủ là máy hỏng": lõi để hiện thực song song hoặc tối ưu có thể đổi thứ tự duyệt.
- Cũng là lý do sau khi nâng phiên bản game phải **kiểm chứng lại từng máy**: chính thức sửa bug sẽ tiện thể đổi một số thứ tự.
- Cách gỡ lỗi: bản gốc cung cấp lệnh điều khiển kiểu `/tick` (đóng băng, từng bước, tăng tốc…, lệnh con cụ thể thay đổi theo phiên bản), có thể quan sát trạng thái máy từng tick; cũng có công cụ gỡ lỗi kiểu Carpet.

### 5.4 "Máy lag" là phương tiện phá hoại

**Máy lag (lag machine) là thiết bị cố ý dựng ra nhằm đè sụp máy chủ.** Hình thức thường gặp:

- Clock redstone tần suất cực cao, đi với mạch redstone diện rộng tạo bão cập nhật;
- Sinh tức thời lượng lớn thực thể (TNT, vật rơi, giá để giáp, xe mỏ, thuyền);
- Để nước và dung nham chảy và cập nhật diện rộng;
- Dùng cơ chế nạp chunk tạo vòng "nạp mãi + tick mãi";
- Lặp đi lặp lại sinh/gỡ chunk, để luồng chính làm việc chunk mãi.

Tính chất của nó là **hành vi phá hoại, không phải lối chơi**: mục đích là làm mọi người rớt mạng, làm máy chủ không lưu bình thường được, thậm chí làm hỏng bản lưu.

### 5.5 Phát hiện máy lag thế nào

| Tín hiệu | Giải thích |
| --- | --- |
| MSPT tự nhiên tăng vọt liên tục, TPS rơi xuống một chữ số | Biểu hiện trực tiếp nhất |
| Số lượng thực thể bất thường | Trước khi dùng lệnh kiểu `/kill` để đếm **đừng vội dọn**, đó là bằng chứng |
| Trong flame graph của spark xuất hiện điểm nóng redstone/thực thể/chunk tập trung | Định vị được chunk và tọa độ cụ thể |
| Người chơi báo "cứ tới gần một tọa độ nào đó là lag" | Tọa độ chính là đầu mối |
| Nhật ký xuất hiện cảnh báo hạn mức thực thể hoặc watchdog | Máy chủ đã đang tự bảo vệ |

Thứ tự xử lý khuyến nghị: **định vị tọa độ và thiết bị trước → chụp ảnh/ghi lại → xử lý theo nội quy → khôi phục vùng bị ảnh hưởng**. Chống gian lận, nhật ký và quay lui xem [Chống gian lận và chống phá hoại](/tutorials/java/anticheat).

## 6. Quyền hạn và công cụ

### 6.1 Phía máy chủ: công cụ kiểu Carpet

- Máy chủ hướng kỹ thuật phổ biến dùng **Fabric + Carpet** (và các tiện ích mở rộng) làm công cụ quy tắc và gỡ lỗi phía máy chủ: nó bật tắt được rất nhiều hành vi chi tiết của bản gốc, cũng cung cấp lệnh gỡ lỗi.
- **Tên quy tắc cụ thể và tập quy tắc dùng được thay đổi theo phiên bản Carpet**, xin lấy tài liệu chính thức của Carpet phiên bản tương ứng làm chuẩn, đừng chép danh sách quy tắc của người khác.
- Carpet là mod phía máy chủ, client bản gốc vào thẳng được, không cần người chơi cài gì.
- Cách làm phổ biến của máy chủ kỹ thuật redstone là: **công khai danh sách quy tắc đã bật**, để người chơi biết hành vi bản gốc nào bị đổi.

### 6.2 Phía client: công cụ kiểu MiniHUD / Litematica

| Công cụ | Công dụng |
| --- | --- |
| MiniHUD | Hiển thị trên HUD tọa độ, quần xã sinh vật, ánh sáng, biên giới chunk… |
| Litematica | Hình chiếu schematic, dựng máy theo bản vẽ |
| Tweakeroo | Một loạt điều chỉnh tiện lợi |
| Servux | Mod phía máy chủ, giúp hiển thị phạm vi công trình và dán schematic hoạt động bình thường trên máy chủ |
| Syncmatica | Tải schematic lên máy chủ, nhiều người chia sẻ |

### 6.3 Máy chủ phải hỗ trợ gì

- Mod phía máy chủ (Carpet, Servux, phần máy chủ của Syncmatica) **cần máy chủ Fabric**. Phía plugin (họ Paper) không chạy trực tiếp mod Fabric; dùng phương án cầu nối sẽ có cái giá về tương thích và hiệu năng, xem [Hướng dẫn đầy đủ máy chủ mod](/tutorials/java/modded).
- Mod thuần client (MiniHUD, phần hiển thị của Litematica) dùng được trên mọi máy chủ, nhưng **phần phụ thuộc dữ liệu máy chủ** (biên giới công trình, dán schematic, đặt chính xác) cần máy chủ phối hợp mới chạy được.
- Vì thế trước khi mở máy chủ kỹ thuật redstone phải chốt một việc: **máy chủ là Fabric hay họ Paper**. Quyết định này một khi đã ra, gần như mọi chuỗi công cụ phía sau đều đi theo nó.
- Còn phải căn khớp **phiên bản**: phiên bản mod client, phiên bản mod máy chủ, phiên bản game cả ba phải khớp, nếu không người chơi không vào được.

### 6.4 Danh sách quyền

Quyền cấp cho người chơi kỹ thuật nên tách nhóm riêng, chứ không cấp thẳng OP:

| Quyền | Công dụng | Rủi ro |
| --- | --- | --- |
| `/forceload` | Cho máy chạy liên tục | Lạm dụng sẽ làm máy chủ tải cao lâu dài, khuyến nghị chế độ đăng ký |
| `/tick` (kiểu đóng băng/từng bước) | Gỡ lỗi thứ tự thời gian của máy | Đóng băng cả máy chủ sẽ cắt ngang mọi người, chú ý thông báo |
| `/gamemode spectator`, `/tp` | Quan sát và dựng | Rủi ro thấp |
| `/spark` | Tự kiểm tra hiệu năng | Rủi ro thấp, khuyến nghị mở cho nhóm kỹ thuật |
| `/give`, chế độ sáng tạo | Dựng máy | Chỉ nên dùng trong môi trường kiểm thử hoặc khu xây dựng được cấp phép rõ ràng |
| Chỉnh sửa hàng loạt kiểu WorldEdit | Thi công nhanh | **Một lần chọn sai là đủ phá hỏng bản lưu**, nhất định phải giới hạn quyền và sao lưu trước |

## 7. Danh sách kiểm tra khi mở máy chủ hướng kỹ thuật

| Mục | Vì sao bắt buộc phải làm |
| --- | --- |
| **Tạo trước thế giới** | Sinh chunk do người chơi chạy bản đồ kích hoạt là sát thủ chính của TPS, tạo trước trả được chi phí này từ sớm, xem [Tối ưu hiệu năng](/tutorials/java/optimize) |
| **Sao lưu trước công trình lớn** | Người chơi kỹ thuật sẽ làm cải tạo diện rộng và thử nghiệm nổ, có vấn đề bạn phải quay về được phút trước |
| **Thế giới kiểm thử/máy chủ kiểm thử riêng** | Máy mới, cấu hình mới, phiên bản lõi mới đều kiểm chứng ở máy chủ kiểm thử trước, tuyệt đối không thử thẳng trên máy chủ chính |
| **Khóa phiên bản và quy trình nâng cấp** | Nâng cấp sẽ làm máy mất hiệu lực, phải thông báo, sao lưu, kiểm chứng lại ở máy chủ kiểm thử rồi mới lên máy chủ chính |
| **Công khai danh sách quy tắc Carpet** | Người chơi cần biết hành vi bản gốc nào bị đổi, nếu không sẽ đoán nhầm máy mất hiệu lực là lỗi của mình |
| **Nội quy rõ về máy lag và đặc tính nhân bản** | Hai việc này bắt buộc phải viết rõ trong nội quy, nếu không xử lý người vi phạm không có căn cứ |
| **Giám sát đường cơ sở** | Ghi lại TPS/MSPT lúc bình thường, mới có so sánh khi "chậm đi", chứ không dựa cảm giác |
| **Quy hoạch lưu trữ** | Tốc độ tăng của sao lưu + schematic + nhật ký thường vượt dự kiến |
| **Phân cấp quyền** | Quyền nhóm kỹ thuật tách khỏi người chơi thường, OP không dễ cấp |
| **Đăng ký máy và kênh liên lạc** | Ai xây máy gì ở đâu là thông tin giá trị nhất khi tìm lỗi |

Một bộ khung nội quy sửa được ngay:

```text
1. Cho phép: máy redstone thông thường, tháp sinh quái, farm cây trồng, cơ sở giao dịch dân làng.
2. Cần đăng ký: chunk nạp thường trực, bộ nạp chunk, mọi thiết bị lớn chạy không người.
3. Cấm: thiết bị nhằm đè sụp máy chủ (dàn clock tần suất cao, sinh thực thể khổng lồ, nạp chunk lặp lại).
4. Đặc tính nhân bản: viết rõ "cho phép" hoặc "cấm", đừng để trống.
5. Nâng phiên bản: thông báo trước, sau nâng cấp máy phải tự kiểm chứng lại, chủ máy chủ không bảo đảm tương thích.
6. Xử phạt: xử lý theo nhật ký và bằng chứng tọa độ, cảnh cáo trước rồi khóa sau.
```

## 8. Tóm lại

- Người chơi kỹ thuật redstone chế tạo **dây chuyền tài nguyên**, phân loại theo tải hữu ích hơn theo sản lượng.
- Cài đặt máy chủ cần quan tâm tập trung ở: **hạn mức và phạm vi sinh quái, phạm vi kích hoạt thực thể, tick ngẫu nhiên, cách hiện thực redstone, nạp chunk**.
- **Chunk nạp thường trực là có cái giá**: bộ nhớ, CPU, hạn mức sinh quái và độ giật của bản lưu, bắt buộc phải kiểm toán và đăng ký.
- Hiểu **20 TPS / 50 mili giây** và **redstone tick = 2 game tick** mới hiểu được vì sao máy hỏng, vì sao chậm.
- **Máy lag là phương tiện phá hoại**, phải có nội quy, có phát hiện, có quay lui.
- Chọn chuỗi công cụ (Fabric + Carpet so với họ Paper) là **quyết định đầu tiên** của máy chủ kỹ thuật redstone, nó sẽ quyết định mọi thứ phía sau.

:::tip TPS của máy chủ kỹ thuật là kết quả thiết kế, không phải kết quả cấu hình
Nhiều chủ máy chủ coi "lag" là vấn đề cấu hình, thế là cứ chỉnh tham số, đổi plugin tối ưu, cuối cùng chỉnh hỏng hết máy. Thực tế là: **TPS do người chơi chế tạo máy gì, máy lớn cỡ nào, đặt ở đâu, nạp bao nhiêu chunk quyết định**. Tham số chỉ cho bạn đánh đổi giữa hành vi bản gốc và hiệu năng, không thể biến một cái máy thiết kế tệ thành rẻ đi từ trên trời. Xem thiết kế trước, rồi mới nói cấu hình.
:::

Bài đọc liên quan: [Kỹ thuật redstone và máy móc](/tutorials/java/redstone) (nhập môn và chọn lõi), [Tối ưu hiệu năng](/tutorials/java/optimize) (cách định vị lag), [Lag do thực thể và vật rơi tích tụ](/tutorials/faq/entity-lag), [Chống gian lận và chống phá hoại](/tutorials/java/anticheat), [Hướng dẫn đầy đủ máy chủ mod](/tutorials/java/modded).

> Cơ chế game, API và phiên bản định dạng gói lấy tài liệu chính thức tương ứng làm chuẩn.
