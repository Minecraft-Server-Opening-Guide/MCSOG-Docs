---
title: Báo lỗi và kiểm tra crash thường gặp của Java Edition
slug: errors
cat: faq
level: 2
order: 3
minutes: 18
tags: [java, errors, crash, troubleshooting, plugins, logs, compatibility]
updated: 2026-10-04
draft: false
---

Bài này nói về **đọc báo lỗi thế nào, định vị không tương thích thế nào**. Nó không nhằm liệt kê hết mọi ngoại lệ, mà đưa cho bạn một thứ tự phán đoán: trước tiên phân biệt "plugin ném ngoại lệ nhưng máy chủ còn sống" với "máy chủ sập luôn", rồi đi theo stack tìm nguyên nhân gốc, cuối cùng dùng kiểm tra tối giản để xác nhận.

Không tương thích là loại sự cố tốn thời gian nhất trong máy chủ Java Edition, vì nó thường **không đưa ra gợi ý rõ ràng**, hoặc tên lớp nó đưa ra chẳng liên quan gì đến nguyên nhân thật. Chỗ nào bài này không chắc, đều sẽ ghi "lấy tài liệu chính thức làm chuẩn", chứ không bịa ra một cách giải thích trông có lý.

## 1. Đọc một bản báo lỗi thế nào

### 1.1 Nhật ký nằm ở đâu

| Vị trí | Nội dung | Xem khi nào |
| --- | --- | --- |
| `logs/latest.log` | Toàn bộ đầu ra console của lần chạy hiện tại hoặc gần nhất | **Hiện trường đầu tiên**. Mỗi lần máy chủ khởi động lại sẽ ghi đè nó, muốn giữ chứng cứ thì chép đi trước |
| `logs/2026-10-04-1.log.gz` | Nhật ký lịch sử, luân chuyển theo ngày và dung lượng rồi nén | Khi vấn đề xảy ra vài ngày trước, `latest.log` đã bị ghi đè |
| `crash-reports/crash-...-server.txt` | Báo cáo crash: stack đầy đủ, mô tả, môi trường chạy lúc đó | Khi máy chủ **thoát bất thường** thì xem đây trước |
| Bản thân cửa sổ console | Đầu ra thời gian thực, cuộn rất nhanh | Xem trong lúc chạy; nội dung trước khi crash rất dễ bị cuốn mất, chép trước |

Cấu trúc thư mục và tác dụng của từng tệp xem [Cấu trúc máy chủ](/tutorials/java/structure).

:::tip Chép trước, khởi động lại sau
`logs/latest.log` sẽ bị ghi đè ở lần khởi động kế tiếp. **Trước khi khởi động lại máy chủ**, hãy chép `logs/latest.log` và tệp mới nhất trong `crash-reports/` ra chỗ khác, nếu không chứng cứ bạn cần kiểm tra sẽ mất.
:::

Định vị nhanh theo từ khóa (Linux):

```bash
grep -nE "ERROR|Exception|Caused by" logs/latest.log | tail -40
ls -lt crash-reports/ | head
```

Windows PowerShell:

```powershell
Select-String -Path logs\latest.log -Pattern "ERROR|Exception|Caused by" | Select-Object -Last 40
Get-ChildItem crash-reports | Sort-Object LastWriteTime -Descending | Select-Object -First 5
```

### 1.2 Khác nhau giữa ngoại lệ plugin và crash chí mạng

Hai thứ này phải xử lý riêng, nếu không rất dễ lạc trong một mớ chữ đỏ không liên quan.

| | Ngoại lệ plugin (đa số trường hợp) | Crash chí mạng |
| --- | --- | --- |
| Trạng thái máy chủ | Tiếp tục chạy, người chơi vẫn trực tuyến | Tiến trình thoát, cửa sổ đóng hoặc dịch vụ systemd dừng |
| Kết thúc nhật ký | Sau ngoại lệ vẫn còn đầu ra tick bình thường | Kết thúc là `This crash report has been saved to: ...` |
| Dấu hiệu điển hình | `Could not pass event ... to X`, `... has failed to load`, `... was disabled` | `Encountered an unexpected exception`, `Exception in server tick loop`, `Watching Server thread` |
| Phạm vi ảnh hưởng | Một plugin hoặc một chức năng | Toàn bộ máy chủ |
| Hướng xử lý | Sửa plugin, cập nhật plugin hoặc tắt nó trước | Cho máy chủ lên trước, rồi đọc báo cáo crash |

Dưới đây là một ngoại lệ plugin **mang tính minh họa** (dùng để giải thích cấu trúc, không phải một nhật ký thật), máy chủ sẽ tiếp tục chạy:

```text
[12:00:01 ERROR]: Could not pass event PlayerJoinEvent to MyPlugin v1.2.3
java.lang.NullPointerException: Cannot invoke "java.lang.String.toLowerCase()" because "name" is null
        at com.example.myplugin.JoinListener.onJoin(JoinListener.java:42) ~[MyPlugin-1.2.3.jar:?]
        at org.bukkit.plugin.java.JavaPluginLoader$1.execute(JavaPluginLoader.java:315) ~[paper-api.jar:?]
        at org.bukkit.plugin.RegisteredListener.callEvent(RegisteredListener.java:70) ~[paper-api.jar:?]
        ... 20 more
[12:00:02 INFO]: Player Steve joined the game
```

Điểm then chốt là dòng cuối: **sau ngoại lệ máy chủ vẫn xử lý sự kiện tiếp theo như thường**, chứng tỏ đây là lỗi cấp plugin bị framework bắt.

### 1.3 Đọc stack Java thế nào

Một stack **minh họa** có chuỗi `Caused by`:

```text
[12:00:05 ERROR]: Encountered an unexpected exception
java.lang.RuntimeException: Failed to load plugin data
        at com.example.core.DataLoader.load(DataLoader.java:88) ~[?:?]
        at com.example.core.CorePlugin.onEnable(CorePlugin.java:31) ~[?:?]
        at org.bukkit.plugin.java.JavaPlugin.setEnabled(JavaPlugin.java:280) ~[paper-api.jar:?]
        ... 18 more
Caused by: java.lang.NoSuchMethodError: 'void org.bukkit.configuration.file.FileConfiguration.setDefaults(org.bukkit.configuration.file.FileConfiguration)'
        at com.example.core.DataLoader.load(DataLoader.java:71) ~[?:?]
        ... 18 more
Caused by: java.lang.ClassNotFoundException: com.example.lib.RequiredLib
        at java.net.URLClassLoader.findClass(URLClassLoader.java:445) ~[?:?]
        ... 21 more
```

Bóc từng dòng ra xem:

- `[12:00:05 ERROR]:` là tiền tố nhật ký (thời gian và mức độ), không phải nội dung báo lỗi.
- `java.lang.RuntimeException: Failed to load plugin data` là **ngoại lệ lớp ngoài cùng**. Nó thường chỉ là lớp bọc, thông tin thật nằm bên dưới.
- `at package.Class.method(File.java:123)` là chuỗi gọi. **Dòng trên cùng là vị trí ném ngoại lệ, càng xuống dưới càng gần framework phía trên đã gọi nó**.
- `Caused by:` mới là chuỗi nguyên nhân gốc, có thể có nhiều lớp. **`Caused by` cuối cùng là nguyên nhân gốc sâu nhất**.
- `... 18 more` nghĩa là lược bớt các khung stack hoàn toàn giống lớp trên, không phải nhật ký bị cắt.
- `~[MyPlugin-1.2.3.jar:?]` là dấu nguồn, cho biết khung stack này đến từ jar nào; `~[?:?]` nghĩa là nguồn không xác định.

:::tip Chỉ xem hai dòng
Thứ thực sự hữu ích trong một stack là **dòng tiêu đề của ngoại lệ đầu tiên** và **dòng tiêu đề của `Caused by` cuối cùng**. Mấy chục dòng `at` ở giữa đại đa số là chuỗi gọi của chính framework. Tìm được hai dòng này rồi, hãy quay lại tìm **tên gói thuộc plugin của chính bạn xuất hiện trong `at` đầu tiên**, đó thường là vị trí mã có vấn đề.
:::

Số dòng là để tác giả định vị mã: nếu lỗi ở plugin của chính bạn, số dòng có thể đối chiếu thẳng mã nguồn; nếu là plugin bên thứ ba, số dòng chỉ giúp bạn phán đoán "chức năng nào có vấn đề", không hơn.

Ngoài ra, tiền tố `[MyPlugin]` trong nhật ký do plugin tự in. **Dùng tên plugin để tìm trong nhật ký** nhanh hơn đọc cả tệp nhiều.

### 1.4 Lỗi Mixin và remap trông thế nào

Mixin là framework chèn bytecode của SpongePowered, Fabric, Forge, NeoForge, Sponge và một số nền tảng lai đều dùng nó; một số plugin cũng "hook" logic game qua Mixin hoặc tham chiếu trực tiếp phần triển khai nội bộ của máy chủ.

Hình thái điển hình của loại lỗi này:

```text
org.spongepowered.asm.mixin.transformer.throwables.MixinTransformerError: An unexpected critical error was encountered
Caused by: org.spongepowered.asm.mixin.throwables.MixinApplyError: Mixin [mymod.mixins.json:PlayerMixin] from mod [mymod] FAILED during APPLY
```

Hình thái điển hình khi tham chiếu phần triển khai nội bộ máy chủ (NMS):

```text
java.lang.NoClassDefFoundError: net/minecraft/server/v1_20_R1/MinecraftServer
        at com.example.nmsplugin.NmsHook.<clinit>(NmsHook.java:17) ~[?:?]
Caused by: java.lang.ClassNotFoundException: net.minecraft.server.v1_20_R1.MinecraftServer
```

**Chỉ cần nhận hai đặc trưng này là đủ**:

1. Trong báo lỗi xuất hiện các chữ như `mixin`, `MixinApplyError`, `InvalidMixinException`, `MixinTransformerError`, `mixin config`;
2. Trong báo lỗi xuất hiện các tên gói **có số phiên bản hoặc trỏ vào nội bộ máy chủ** như `net.minecraft.server.v1_xx_Rx`, `org.bukkit.craftbukkit...`.

Bản thân những cái tên này đã nói lên: đoạn mã này được viết **cho một phiên bản cụ thể, một loader cụ thể**, mà môi trường nó đang chạy không phải cái nó kỳ vọng. **Đây gần như luôn là lệch phiên bản, chứ không phải cấu hình của bạn viết sai.**

:::warn Đừng nghi ngờ cấu hình trước với loại lỗi này
Thấy tên lớp liên quan Mixin hoặc NMS, hãy đi đối chiếu phiên bản trước (phiên bản game, phiên bản lõi/loader, phiên bản plugin hoặc mod), đừng đi sửa `config.yml`. Cách diễn đạt báo lỗi và phạm vi hỗ trợ cụ thể, **lấy tài liệu chính thức của loader và plugin tương ứng làm chuẩn**.
:::

## 2. Plugin không tương thích

### 2.1 Bảng đối chiếu triệu chứng

| Báo lỗi hoặc triệu chứng | Ý nghĩa | Nguyên nhân thường gặp |
| --- | --- | --- |
| `NoClassDefFoundError: com/example/lib/Foo` | Lúc chạy không tìm thấy lớp này | Thiếu phần phụ thuộc cứng (`depend` không thỏa); plugin biên dịch cho **loại máy chủ khác**; lớp đó đến từ phần triển khai nội bộ máy chủ |
| `ClassNotFoundException: ...` | Như trên, thường là không tìm thấy khi nạp lớp rõ ràng | Thiếu phần phụ thuộc; plugin có cấu trúc nhiều jar mà bạn không đặt đủ; tệp tải về bị hỏng |
| `NoSuchMethodError: 'void a.b.C.d(...)'` | Tìm thấy lớp, nhưng **chữ ký phương thức không khớp** | Phiên bản API mà plugin dựa vào lúc biên dịch khác máy chủ hoặc phần phụ thuộc hiện tại (phần nhiều là plugin mới hơn máy chủ, hoặc phần phụ thuộc quá cũ) |
| `AbstractMethodError` | Interface thêm phương thức mới, lớp triển khai không có | Plugin biên dịch theo API **cũ hơn**, mà máy chủ hoặc phần phụ thuộc hiện tại đã đổi interface |
| `UnsupportedClassVersionError ... class file version 65.0` | Plugin biên dịch bằng **Java mới hơn** | Java của bạn cũ hơn yêu cầu của plugin (65 = Java 21); đổi Java hoặc đổi phiên bản plugin |
| `MixinApplyError` / `InvalidMixinException` / `MixinTransformerError` | Chèn Mixin thất bại | Plugin hook vào phần triển khai nội bộ mà nó chưa từng nhắm đến, thuộc lệch phiên bản |
| Plugin nạp thành công, nhưng lệnh của nó không phản ứng | Chức năng bị tắt âm thầm | Phần phụ thuộc mềm (`softdepend`) không thỏa; extension hoặc module tương ứng chưa cài |
| Plugin tự tắt chính mình khi khởi động | Tác giả chủ động kiểm tra phiên bản | Phiên bản hiện tại không trong phạm vi hỗ trợ, plugin từ chối nạp, nhật ký thường ghi rõ phiên bản nó hỗ trợ |

:::note NoClassDefFoundError đôi khi là "di chứng"
Nếu trong nhật ký phía trước còn một dòng `ExceptionInInitializerError`, thì `NoClassDefFoundError` chỉ là kết quả sau đó của việc khởi tạo tĩnh thất bại, **nguyên nhân thật nằm ở dòng nhật ký trước đó**.
:::

### 2.2 Thứ tự sửa

Làm theo thứ tự dưới đây, mỗi bước chỉ đổi một biến:

1. **Trước tiên xác nhận ba phiên bản**: phiên bản game (1.20.4 / 1.21.x v.v.), phần mềm máy chủ (Paper / Purpur / Spigot / Fabric / Forge / NeoForge), phiên bản Java. Quan hệ giữa Java và phiên bản game xem [Chuẩn bị môi trường (Windows và Linux)](/tutorials/java/environment).
2. **Tra phạm vi hỗ trợ của plugin**: Supported Versions trên trang phát hành, README, và `api-version` trong `plugin.yml` bên trong jar.
3. **Bổ sung đủ phần phụ thuộc**: các plugin hay bị phụ thuộc nhất như Vault, PlaceholderAPI, ProtocolLib, LuckPerms, xem [Các plugin phụ thuộc thường dùng](/tutorials/java/plugin-deps).
4. **Cập nhật hoặc hạ phiên bản plugin**: ưu tiên cho plugin khớp phiên bản với lõi. Nhiều plugin duy trì song song nhiều nhánh hoặc nhiều jar, **tải đúng nhánh trước**, rồi mới nói đến số phiên bản.
5. **Đổi plugin ngừng cập nhật**: nếu phiên bản cuối cùng plugin hỗ trợ rõ ràng thấp hơn phiên bản lõi của bạn, đừng cố chịu, tìm sản phẩm thay thế vẫn đang bảo trì.
6. **Định vị bằng phương pháp chia đôi**: mấy bước trên làm xong vẫn không được, dùng cách dưới đây thu hẹp phạm vi về một plugin.

### 2.3 Chia đôi: thu vấn đề về một plugin

```text
1. Dừng máy chủ, chép cả thư mục plugins/ ra một bản sao lưu
2. Chỉ giữ phần phụ thuộc cần thiết và đối tượng khả nghi, chuyển hết phần còn lại ra khỏi plugins/
3. Khởi động, thử tái hiện vấn đề
   vẫn báo lỗi -> vấn đề nằm trong mấy cái này, tiếp tục chia đôi
   không báo lỗi -> vấn đề nằm trong nhóm bị chuyển ra, đưa một nửa về, lặp lại
4. Mỗi vòng đều bắt đầu từ "chuyển hết ra, thêm lại một nửa", tối đa log2(N) vòng
5. Định vị đến một plugin xong, mới thử các phiên bản khác nhau của nó, chứ không chỉ thử bản mới nhất
```

:::tip Đừng đổi hết mọi thứ một lần
"Nâng tất cả plugin lên bản mới nhất" sẽ biến biến số từ 1 thành N, sau đó muốn định vị phải làm lại từ đầu. **Mỗi lần chỉ động một biến.**
:::

### 2.4 Màu của `/plugins` và console

Trong máy chủ hệ Paper / Spigot, `/plugins` dùng màu để phân biệt trạng thái: **xanh là đã bật, đỏ là nạp thất bại hoặc bị tắt**. Nó chỉ cho bạn biết có mấy cái đỏ, **không cho bạn biết vì sao**.

Nguyên nhân nhất định nằm trong console và `logs/latest.log`, hình thức điển hình như sau (minh họa):

```text
[12:00:02 WARN]: [MyPlugin] Could not load 'plugins/MyPlugin.jar' in folder 'plugins'
org.bukkit.plugin.UnknownDependencyException: Unknown/missing dependency plugins: [Vault]. Please download and install these plugins.
        at org.bukkit.plugin.java.JavaPluginLoader.loadPlugin(JavaPluginLoader.java:155) ~[paper-api.jar:?]
        ...
[12:00:02 WARN]: [MyPlugin] Disabling MyPlugin v1.2.3
```

Dùng tên plugin tìm trong nhật ký, thường vài giây là thấy nguyên nhân. Chi tiết liên quan phần phụ thuộc xem [Các plugin phụ thuộc thường dùng](/tutorials/java/plugin-deps), kiến thức cơ bản về cài đặt và nạp plugin xem [Nhập môn plugin](/tutorials/java/plugins).

## 3. Lõi không tương thích

### 3.1 Họ API: hệ Bukkit là một tuyến

Bukkit, Spigot, Paper, Purpur, Leaves, Leaf, Folia thuộc cùng một họ API, là quan hệ **tương thích ngược từng lớp xuống**: plugin viết cho lớp trên thường chạy được ở lớp dưới, ngược lại thì không.

| API mà plugin biên dịch theo | Spigot | Paper / Purpur | Folia |
| --- | --- | --- | --- |
| Bukkit / Spigot API | Được | Được | Cần plugin khai báo hỗ trợ Folia |
| Paper API | Thường không (thiếu lớp hoặc phương thức) | Được | Cần plugin thích ứng |
| NMS hoặc API riêng của một nhánh | Chỉ phiên bản tương ứng | Chỉ phiên bản tương ứng | Thường không |

:::note "Được" trong bảng chỉ là phán đoán ở mức API
Nó không đại diện hành vi thực tế của plugin nhất định đúng. **Plugin có chạy được trên lõi của bạn không, lấy giải thích chính thức của plugin làm chuẩn.**
:::

Folia là ngoại lệ: nó chia thế giới thành vùng và tick song song, nên **yêu cầu plugin khai báo rõ trong `plugin.yml` là hỗ trợ Folia**, nếu không sẽ bị từ chối nạp thẳng. Trường cụ thể và giới hạn lấy tài liệu chính thức của Folia làm chuẩn.

### 3.2 Vì sao plugin dùng NMS cứ mỗi lần cập nhật là hỏng

NMS chỉ `net.minecraft.server`, tức là **phần triển khai nội bộ** của máy chủ. Mojang chưa bao giờ cam kết phần này ổn định: tên lớp, tên phương thức, tên trường đều có thể đổi giữa các phiên bản.

- Plugin chỉ dùng **API công khai** của Bukkit / Paper, nâng cấp qua các phiên bản nhỏ thường không vấn đề.
- Plugin tham chiếu NMS, **mỗi phiên bản game tác giả đều phải thích ứng lại**, bỏ qua phiên bản trung gian gần như chắc chắn hỏng.
- Thời Spigot đưa phần triển khai nội bộ vào gói **có số phiên bản** như `v1_20_R1` qua remap, nên plugin đổi phiên bản một cái là không tìm thấy lớp.
- Paper từ 1.20.5 chuyển sang dùng mapping chính thức của Mojang, cách viết plugin NMS khác trước đây, **thay đổi cụ thể lấy thông báo chính thức của Paper làm chuẩn**.

Đặc trưng báo lỗi rất thống nhất: `NoClassDefFoundError`, `NoSuchMethodError`, `NoSuchFieldError`, và trong tên lớp có `net.minecraft` hoặc `org.bukkit.craftbukkit`.

### 3.3 Phía plugin và phía mod không thể thay thế nhau

| Máy chủ của bạn | Nạp được plugin | Nạp được mod |
| --- | --- | --- |
| Paper / Purpur / Spigot | Có | Không |
| Fabric / Forge / NeoForge | Không (cần cầu nối) | Có |
| Nền tảng lai (Arclight, Mohist, Youer v.v.) | Thường cả hai đều được | Thường cả hai đều được |

- **Mod của Fabric / Forge / NeoForge, phía plugin không nạp được**; ngược lại, plugin cũng không thể ném thẳng vào phía mod.
- Nền tảng lai nạp được cả hai bên, nhưng **tương thích do chính nền tảng lai duy trì**, hệ sinh thái hai bên đều có thể có vấn đề. Trên nền tảng lai gặp plugin báo lỗi, hãy vào tài liệu chính thức của nền tảng lai xác nhận nó hỗ trợ những plugin và mod nào.
- Phía proxy (Velocity, BungeeCord) là **bộ API thứ ba**: plugin Bukkit không đặt vào Velocity được, plugin Velocity cũng không đặt vào Paper được. Giải thích liên quan xem [Phía chuyển máy chủ](/tutorials/java/proxy).

Chi tiết và đánh đổi xem [Nhập môn plugin](/tutorials/java/plugins) và [Chọn máy chủ](/tutorials/java/core).

### 3.4 Khớp ba bên của máy chủ mod

Máy chủ mod phải khớp đồng thời ba thứ: **phiên bản game + phiên bản loader + từng mod**. Thiếu một thứ, loader sẽ từ chối khởi động và liệt kê mod có vấn đề.

Hình thức điển hình của Fabric (minh họa, cách diễn đạt thực tế lấy tài liệu chính thức Fabric làm chuẩn):

```text
Incompatible mod set!
net.fabricmc.loader.impl.FormattedException: Mod resolution encountered an incompatible mod set!
A potential solution has been determined:
         - Replace mod 'Sodium' (sodium) 0.5.8 with a version that supports minecraft 1.20.1
```

Hình thức điển hình của Forge / NeoForge (minh họa):

```text
Missing or unsupported mandatory dependencies:
        Mod ID: 'create', Requested by: 'mymod', Expected range: '[0.5.1,)', Actual version: '0.5.0'
```

Mod khai báo phụ thuộc trong metadata: Fabric trong `depends` của `fabric.mod.json`, Forge / NeoForge trong `[[dependencies]]` của `mods.toml`. Ngoài ra phải phân biệt mod **chỉ client**, **chỉ máy chủ** và **dùng được cả hai đầu**: đặt mod chỉ client vào `mods/` của máy chủ cũng sẽ báo lỗi.

### 3.5 Chẩn đoán lõi không tương thích thế nào

1. **Đọc lỗi đầu tiên trong console có nhắc đến tên lớp, tên gói hoặc ID mod**. Các lỗi sau phần lớn là phản ứng dây chuyền của nó.
2. **Xem `api-version` trong `plugin.yml`** (plugin Paper / Spigot). Nó là một **gợi ý**: cho biết phiên bản API mục tiêu tác giả khai báo, nhưng **không bảo đảm** chạy bình thường trên lõi của bạn. Khi thiếu trường này, máy chủ thường xử lý như "plugin cũ" và đưa gợi ý, hành vi cụ thể lấy tài liệu chính thức của máy chủ làm chuẩn.
3. **Tái hiện trên máy chủ kiểm tra sạch**: lõi cùng phiên bản, chỉ đặt plugin này (cộng phần phụ thuộc cần thiết), dùng một thế giới mới. Nếu vẫn báo lỗi như thế thì là vấn đề plugin với lõi hoặc phiên bản, không phải vấn đề cấu hình của bạn.
4. **Đối chiếu ma trận hỗ trợ chính thức**: xem cả ba chỗ là trang phát hành plugin, tài liệu chính thức của lõi, trang của mod.
5. **Kiểm tra có trộn đồ của các họ khác nhau không**: trong thư mục plugin xuất hiện mod, plugin phía proxy ném vào máy chủ con, đều sinh ra báo lỗi không hiểu nổi.

### 3.6 Chiến lược nâng và hạ phiên bản

- **Sao lưu trước khi nâng cấp**: ít nhất gồm thư mục `world` series, cấu hình plugin, `server.properties`, và **ghi lại số phiên bản của toàn bộ plugin và mod hiện tại**.
- **Giữ lại jar lõi trước đó**: có vấn đề thì đổi lại ngay, nhanh hơn nhiều so với kiểm tra tại chỗ.
- **Ghim phiên bản plugin**: sau khi nâng cấp lõi, đừng nâng tất cả plugin lên bản mới nhất cùng lúc; xác nhận lõi khởi động bình thường trước, rồi nâng plugin từng đợt.
- **Đừng nâng thế giới trước**: thế giới một khi bị phiên bản cao hơn mở, hạ về lõi cũ có thể không đọc lại được. **Cho lõi chạy thông trên phiên bản mới và xác nhận muốn giữ, rồi mới động vào thế giới.**
- **Đẩy theo từng đợt**: lõi -> phần phụ thuộc -> plugin phụ thuộc phần phụ thuộc -> plugin khác, mỗi đợt đều khởi động kiểm tra một lần.
- **Phía proxy cũng vậy**: nâng máy chủ con trước, xác nhận không vấn đề rồi mới nâng proxy.

:::warn Tiền đề của hạ phiên bản là "bản sao lưu trước khi nâng cấp"
Dữ liệu thế giới một khi bị phiên bản mới ghi vào, phiên bản cũ có thể từ chối nạp thẳng. **Không có bản sao lưu đầy đủ trước khi nâng cấp thì đừng nâng cấp.**
:::

## 4. Các báo lỗi tần suất cao khác

### 4.1 UnsupportedClassVersionError (sai phiên bản Java)

```text
java.lang.UnsupportedClassVersionError: com/example/Plugin has been compiled by a more recent
version of the Java Runtime (class file version 65.0), this version of the Java Runtime only
recognizes class file versions up to 61.0
```

Hai con số trong ngoặc là **số phiên bản tệp lớp**, không phải số phiên bản Java. Quan hệ đối chiếu:

| Phiên bản tệp lớp | Java tương ứng |
| --- | --- |
| 52 | Java 8 |
| 55 | Java 11 |
| 61 | Java 17 |
| 65 | Java 21 |
| 69 | Java 25 |

- **Plugin báo lỗi này**: Java dùng để biên dịch plugin mới hơn runtime của bạn, đổi Java hoặc đổi phiên bản plugin.
- **Lõi máy chủ báo lỗi này**: Java mà lõi yêu cầu mới hơn runtime của bạn.
- Nên dùng Java nào, tra bảng đối chiếu trong [Chuẩn bị môi trường (Windows và Linux)](/tutorials/java/environment) theo phiên bản game, **đừng cài bản mới nhất theo cảm tính**.
- Đổi `-Xmx`, đổi cấu hình, cài lại plugin đều vô ích, đây không phải vấn đề bộ nhớ hay cấu hình.

:::note Java quá cao cũng có thể có vấn đề
Khi phiên bản Java cao hơn yêu cầu thường không báo lỗi này, nhưng có thể kích hoạt vấn đề tương thích của một số plugin hoặc mod. **Khuyến nghị khớp chặt với yêu cầu**, cụ thể lấy tài liệu chính thức của lõi và plugin làm chuẩn.
:::

### 4.2 Address already in use (cổng bị chiếm)

```text
[12:00:00 ERROR]: **** FAILED TO BIND TO PORT!
[12:00:00 ERROR]: The exception was: java.net.BindException: Address already in use: bind
[12:00:00 ERROR]: Perhaps a server is already running on that port?
```

Nguyên nhân là 25565 (hoặc cổng bạn cấu hình) đã bị tiến trình khác chiếm: một instance máy chủ khác, tiến trình lần trước chưa thoát sạch, hoặc chương trình khác.

Windows:

```powershell
netstat -ano | findstr :25565
taskkill /PID <PID> /F
```

Linux:

```bash
sudo ss -tlnp | grep 25565
kill <PID>
```

Khi chạy nhiều máy chủ trên cùng một máy, bắt buộc phải cấp cho mỗi instance một `server-port` khác nhau. Các bước kiểm tra liên quan cổng xem [Chuẩn bị môi trường (Windows và Linux)](/tutorials/java/environment).

### 4.3 Chưa đồng ý EULA dẫn đến thoát

```text
You need to agree to the EULA in order to run the server. Go to eula.txt for more info.
```

Đây không phải crash, mà là máy chủ từ chối khởi động bình thường. Đổi `eula.txt` trong thư mục máy chủ thành `eula=true` rồi khởi động lại là được. **Chỉ làm vậy khi bạn thực sự đã đọc và đồng ý Minecraft EULA**, văn bản thỏa thuận lấy trang chính thức làm chuẩn.

### 4.4 Báo lỗi liên quan bộ nhớ

| Báo lỗi | Ý nghĩa | Hướng xử lý |
| --- | --- | --- |
| `java.lang.OutOfMemoryError: Java heap space` | Bộ nhớ heap không đủ | Tăng `-Xmx` hợp lý; đồng thời kiểm tra khoảng cách nhìn, số thực thể và plugin có rò rỉ không |
| `java.lang.OutOfMemoryError: GC overhead limit exceeded` | GC tốn nhiều thời gian mà không thu hồi được bộ nhớ | Bản chất vẫn là heap quá nhỏ hoặc rò rỉ bộ nhớ, như trên |
| `Could not reserve enough space for object heap` | JVM thất bại ngay **ở giai đoạn khởi động**, không xin được heap | `-Xmx` vượt quá bộ nhớ khả dụng, hoặc đang dùng Java 32 bit; giảm `-Xmx` và đổi sang Java 64 bit |
| `Error occurred during initialization of VM` | JVM khởi tạo thất bại, thường là vấn đề tham số hoặc bộ nhớ | Kiểm tra `-Xms` / `-Xmx` trong tham số khởi động có hợp lý không |

- `-Xms` là heap ban đầu, `-Xmx` là heap tối đa. Đặt hai cái bằng nhau giảm được chi phí mở rộng heap khi chạy, nhưng **đừng vượt quá bộ nhớ vật lý**, phải để chỗ cho hệ điều hành và tiến trình khác.
- **Tăng `-Xmx` không phải thuốc vạn năng**: nếu bộ nhớ bị plugin hoặc mod rò rỉ mất, tăng chỉ đẩy thời điểm crash ra sau. Dùng công cụ như **spark** xem bộ nhớ và biểu đồ flame, cách làm xem [Tối ưu hiệu năng](/tutorials/java/optimize).
- Tỷ lệ khuyến nghị giữa bộ nhớ và số người chơi xem [Giao thức mở máy chủ và khuyến nghị cấu hình](/tutorials/java/protocol).

### 4.5 Bản lưu và chunk bị hỏng

Hình thức thể hiện liên quan đến phiên bản, thường gặp là báo ngoại lệ IO khi nạp chunk, ví dụ (minh họa, cách diễn đạt thực tế lấy nhật ký gốc và tài liệu chính thức làm chuẩn):

```text
[12:00:00 ERROR]: Error loading chunk [12, 34]: java.io.IOException: Region file is corrupted
[12:00:00 ERROR]: Failed to load chunk at 12, 34
```

Nguyên tắc xử lý:

1. **Đừng tự sửa tay tệp trong `region/`**, sửa trực tiếp rất có thể mở rộng phạm vi hỏng.
2. **Ưu tiên khôi phục bằng bản sao lưu**, đây là cách đáng tin nhất, xem [Sao lưu và khôi phục](/tutorials/java/backup).
3. Khi chỉ một chunk hỏng, mà không muốn quay lui cả bản lưu, có thể dùng công cụ bên thứ ba như **MCA Selector**, **NBTExplorer** xóa hoặc thay thế chunk đó, **cái giá là toàn bộ nội dung trong chunk đó mất theo**.
4. Nếu cùng một đĩa lặp lại hỏng, hãy nghi phần cứng và hệ thống tệp trước (tình trạng sức khỏe đĩa, nhật ký kernel), sửa xong phần cứng rồi mới nói đến khôi phục.

### 4.6 Crash Ticking entity / Ticking block entity

Dòng tiêu đề của loại crash này là `Description: Ticking entity` hoặc `Description: Ticking block entity` (cũng có `Ticking player`), nghĩa là **một thực thể hoặc thực thể khối ném ngoại lệ khi tick**, thường đến từ một mod nào đó, hoặc dữ liệu một chunk đã hỏng.

Báo cáo crash sẽ ghi vị trí của đối tượng có vấn đề (minh họa):

```text
Description: Ticking entity

java.lang.NullPointerException: Cannot invoke "net.minecraft.world.entity.Entity.getType()" because "entity" is null
        at com.example.mymod.TickHandler.onTick(TickHandler.java:64) ~[?:?]

-- Entity being ticked --
    Entity Type: minecraft:pig (net.minecraft.world.entity.animal.Pig)
    Entity's Exact location: 123.45, 64.00, -67.89
    Entity's Block location: World: (123,64,-68), Chunk: (at 11,12 in 7,-5; contains blocks 112,0,-80 to 127,255,-65)
```

Hình thức của thực thể khối tương tự:

```text
Description: Ticking block entity

-- Block entity being ticked --
    Name: minecraft:chest
    Block type: minecraft:chest
    Location: World: (123,64,-68), Chunk: (at 11,12 in 7,-5; ...)
```

**Từ tọa độ định vị đến tệp**:

- Tọa độ chunk = `floor(x) >> 4`, `floor(z) >> 4`. Trong ví dụ trên `x=123` tương ứng chunk `7`, `z=-68` tương ứng chunk `-5`, khớp với `in 7,-5` ghi trong báo cáo.
- Tệp vùng = `r.<floor(chunkX/32)>.<floor(chunkZ/32)>.mca`. Trong ví dụ, chunk `7` và `-5` rơi vào `r.0.-1.mca`, khớp với trường Region trong báo cáo.

**Thứ tự xử lý an toàn**:

1. **Dừng máy chủ và sao lưu đầy đủ thế giới**. Bước này không được bỏ.
2. Dùng công cụ như **MCA Selector**, **NBTExplorer** mở tệp vùng tương ứng, **chỉ xóa đúng một thực thể hoặc thực thể khối đó**, như vậy tổn thất nhỏ nhất.
3. Khi không tìm được thực thể cụ thể, hoặc công cụ không xử lý được, mới cân nhắc xóa cả chunk. **Xóa chunk sẽ xóa luôn công trình, rương và mọi thực thể trong chunk đó.**
4. Xử lý xong khởi động kiểm tra trước, xác nhận không crash nữa, rồi làm một bản sao lưu mới.
5. Nếu thứ có vấn đề là thực thể của mod, quay lại mục 3 đối chiếu "phiên bản game + phiên bản loader + phiên bản mod", **lệch phiên bản thường mới là nguyên nhân gốc**.

:::warn Đừng sửa tệp bản lưu khi máy chủ đang chạy
Sửa tệp `region/` khi máy chủ đang chạy sẽ gây hỏng lần hai. **Dừng máy chủ, sao lưu, rồi mới thao tác.**
:::

### 4.7 Báo lỗi quyền và cổng trên Linux

| Báo lỗi | Nguyên nhân | Xử lý |
| --- | --- | --- |
| `java.io.FileNotFoundException: ... (Permission denied)` | Chủ sở hữu thư mục máy chủ không đúng (ví dụ từng chạy bằng root) | `sudo chown -R mcserver:mcserver /opt/mcserver`, và chạy bằng người dùng chuyên dụng |
| `java.net.BindException: Permission denied` | Bind cổng đặc quyền dưới 1024 mà không phải root | Đổi sang cổng trên 1024, hoặc cấp quyền bind theo nhu cầu (hiểu rõ rủi ro rồi mới làm) |
| Người chơi không kết nối được, nhưng nhật ký không có báo lỗi nào | Tường lửa hoặc nhóm bảo mật cloud chưa mở | Thuộc vấn đề lớp mạng, xem [Chuẩn bị môi trường (Windows và Linux)](/tutorials/java/environment) |

**Đừng chạy máy chủ trực tiếp bằng root**: một khi máy chủ hoặc plugin bị lợi dụng, kẻ tấn công lấy được là cả máy. Thực hành quyền và an ninh xem [[JAVA] Plugin an ninh](/tutorials/ops/security-java).

## 5. Quy trình kiểm tra và danh sách

### 5.1 Đi theo thứ tự này

1. **Đọc nhật ký**. Trước tiên xác nhận là "plugin ngoại lệ, máy chủ còn sống" hay "máy chủ đã sập", quyết định xem `logs/latest.log` hay `crash-reports/`.
2. **Tìm lỗi đầu tiên**. Bắt đầu đọc từ `ERROR` hoặc `Exception` đầu tiên, đừng đoán ngược từ dòng cuối.
3. **Đối chiếu ba phiên bản**. Phiên bản game, phiên bản lõi hoặc loader, phiên bản Java, loại trừ trước sự không khớp cơ bản nhất.
4. **Tái hiện trên máy chủ kiểm tra sạch**. Lõi cùng phiên bản + chỉ đặt plugin khả nghi + thế giới mới, tách "vấn đề cấu hình của bạn" khỏi "vấn đề của chính plugin".
5. **Định vị bằng chia đôi**. Dùng cách ở 2.3 thu phạm vi về một plugin hoặc mod.
6. **Áp dụng sửa chữa**. Theo thứ tự "bổ sung phần phụ thuộc -> chỉnh phiên bản -> đổi sản phẩm thay thế", mỗi lần chỉ đổi một biến.
7. **Kiểm chứng**. Khởi động lại xong xác nhận nhật ký không còn lỗi đó, và thực sự kích hoạt chức năng liên quan một lần.
8. **Ghi chép**. Viết "báo lỗi + nguyên nhân + xử lý" vào ghi chú vận hành của mình, lần sau gặp cùng lỗi tra được ngay.

### 5.2 Danh sách kiểm tra

| Bước | Làm gì | Tiêu chuẩn phán đoán |
| --- | --- | --- |
| 1 | Chép `logs/latest.log` và tệp mới nhất trong `crash-reports/` | Chứng cứ đã lưu, khởi động lại không mất |
| 2 | Phán đoán loại ngoại lệ | Nói được là ngoại lệ cấp plugin hay crash chí mạng |
| 3 | Tìm ngoại lệ đầu tiên và `Caused by` cuối cùng | Lấy được hai dòng tiêu đề |
| 4 | Đối chiếu phiên bản game, phiên bản lõi, phiên bản Java | Ba cái khớp nhau |
| 5 | Đối chiếu phiên bản hỗ trợ và phần phụ thuộc của plugin | Plugin hỗ trợ lõi hiện tại, phần phụ thuộc đầy đủ |
| 6 | Tái hiện trên máy chủ kiểm tra sạch | Tái hiện ổn định, hoặc chứng minh được không liên quan cấu hình của bạn |
| 7 | Thu phạm vi bằng chia đôi | Khóa được vào một plugin hoặc mod |
| 8 | Sửa và kiểm chứng | Nhật ký không còn lỗi đó, chức năng bình thường |
| 9 | Ghi chép và sao lưu | Có ghi chú, có bản sao lưu quay lui được |

### 5.3 Khi đi cầu trợ nên đưa gì

Trước khi hỏi trong nhóm hoặc issue, hãy chuẩn bị mấy thứ này. Thông tin càng đầy đủ, người khác càng dễ thấy vấn đề ngay:

- **Đoạn nhật ký đầy đủ**: từ `ERROR` hoặc `Exception` đầu tiên đến khi ngoại lệ đó kết thúc, **gồm mọi `Caused by`**. Đừng chỉ cắt ba dòng, cũng đừng dùng điện thoại chụp màn hình.
- **Báo cáo crash**: nếu là crash, kèm tệp tương ứng trong `crash-reports/`, nó đã chứa thông tin phiên bản và môi trường.
- **Thông tin phiên bản**: phiên bản game, tên lõi và số bản dựng, đầu ra của `java -version`.
- **Danh sách plugin hoặc mod**: đầu ra của `/plugins`, hoặc tên tệp và số phiên bản trong thư mục `plugins/`, `mods/`.
- **Gần đây đã đổi gì**: nâng cấp lõi, cài plugin mới, sửa tệp cấu hình nào. **Mục này thường chính là câu trả lời.**
- **Các bước tái hiện**: khi nào chắc chắn crash, khi nào không crash.
- **Đã thử những gì**: tránh người khác bảo bạn làm lại thao tác đã loại trừ.

## Tài liệu liên quan

- [Chuẩn bị môi trường (Windows và Linux)](/tutorials/java/environment): đối chiếu phiên bản Java, cổng và quyền
- [Nhập môn plugin](/tutorials/java/plugins): plugin đặt ở đâu, được nạp thế nào
- [Các plugin phụ thuộc thường dùng](/tutorials/java/plugin-deps): Vault, PlaceholderAPI, ProtocolLib, LuckPerms
- [Chọn máy chủ](/tutorials/java/core): định vị và phạm vi tương thích của từng lõi
- [Tối ưu hiệu năng](/tutorials/java/optimize): dùng spark xem bộ nhớ và lag
- [[JAVA] Câu hỏi thường gặp](/tutorials/faq/faq-java): bảng tra nhanh theo hiện tượng

> Thông tin báo lỗi và tên khóa cấu hình lấy theo tài liệu chính thức của plugin và lõi tương ứng.
