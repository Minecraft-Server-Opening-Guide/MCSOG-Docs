---
title: Nhập môn phát triển plugin và gói dữ liệu
slug: develop
cat: java
level: 3
order: 28
minutes: 19
tags: [java, phát triển plugin, gói dữ liệu, paper, công cụ build, api, kiểm thử]
updated: 2026-10-04
draft: false
---

Mấy bài trước nói về "dùng đồ của người khác": cài plugin, cài gói dữ liệu, cấu hình máy chủ. Bài này nói về **tự viết**.

Viết cho hai loại người: chủ máy chủ muốn thêm một công thức hoặc một lệnh tự định nghĩa cho máy chủ, và người chơi muốn học phát triển plugin Bukkit / Paper từ số không. Mục tiêu không phải để bạn viết ra tác phẩm hoàn chỉnh, mà là để bạn **biết có những con đường nào, mỗi con đường cần chuẩn bị gì, và bộ khung tối thiểu chạy được lần đầu trông thế nào**.

Một nguyên tắc xuyên suốt cả bài: **tên lớp, tên phương thức, định dạng gói và tên thư mục đều thay đổi theo phiên bản, tài liệu chính thức luôn ưu tiên hơn mọi hướng dẫn, kể cả bài này.** Bài này không bịa ra bất kỳ tên API hay số định dạng cụ thể nào.

## 1. Chọn đúng công cụ trước: gói dữ liệu / plugin / mod

Định vị của ba con đường hoàn toàn khác nhau, xem bảng so sánh trước.

| Khía cạnh | Gói dữ liệu (datapack) | Plugin | Mod |
| --- | --- | --- | --- |
| Có phải viết mã không | Không cần (JSON + mcfunction) | Cần Java | Cần Java |
| Công cụ build | Không cần | Maven hoặc Gradle | Chuỗi công cụ của loader |
| Chạy được trên máy chủ bản gốc | Được | Không | Không |
| Chạy được trên họ Paper | Được | Được | Không (cần cầu nối) |
| Sửa được gì | Dữ liệu game đã mở ra: công thức, bảng chiến lợi phẩm, tiến trình, hàm, tag, một phần dữ liệu sinh thế giới | Mọi thứ API mở ra: lệnh, sự kiện, thực thể, khối, GUI, mạng | Bản thân mã game: khối mới, sinh vật mới, chiều mới |
| Kiểm thử thế nào | `/reload` + `/datapack list` | Khởi động lại máy chủ | Khởi động lại client và máy chủ |
| Cái giá khi nâng phiên bản | Thấp (đổi số định dạng và tên thư mục) | Trung bình (API đại thể ổn định, dùng thẳng lớp nội bộ là vỡ) | Cao (phải đợi loader và từng mod cập nhật) |
| Công dụng điển hình | Đổi quy tắc, thêm công thức, thêm lệnh, logic nhẹ | Kinh tế, lãnh thổ, menu, đa máy chủ, hệ thống lối chơi đầy đủ | Thêm nội dung mới, modpack lớn |

Thứ tự lựa chọn khuyến nghị là: **giải quyết được bằng gói dữ liệu thì dùng gói dữ liệu; gói dữ liệu không làm được mới viết plugin; cần sửa bản thân game mới làm mod.** Tiêu chuẩn phán đoán:

- Thứ bạn muốn đổi **game đã mở ra thành dữ liệu** (công thức, rơi đồ, tiến trình, hàm, tag) → gói dữ liệu.
- Việc bạn muốn làm **cần nghe sự kiện hoặc tương tác với người chơi** (lệnh tự định nghĩa, GUI, kinh tế, quyền) → plugin.
- Thứ bạn muốn thêm **vốn không tồn tại trong game** (khối mới, sinh vật mới) → mod.

## 2. Con đường gói dữ liệu

Gói dữ liệu có ngưỡng thấp nhất trong ba con đường: **không có công cụ build, không có phụ thuộc, không cần biên dịch**, viết vài tệp JSON và văn bản là có hiệu lực.

### 2.1 Kết cấu thư mục

Gói dữ liệu của máy chủ đặt trong `datapacks/` dưới **thư mục bản lưu**, tên thư mục bản lưu do `level-name` trong `server.properties` quyết định (mặc định là `world`):

```text
world/
  datapacks/
    my_pack/
      pack.mcmeta
      data/
        my_pack/
          function/
            tick.mcfunction
            hello.mcfunction
          advancement/
          loot_table/
          tags/
            function/
              tick.json
              load.json
```

Tên thư mục namespace (`my_pack` ở trên) chính là tiền tố bạn dùng khi tham chiếu nội dung, ví dụ `my_pack:hello`. **Khuyến nghị namespace chỉ dùng chữ thường, chữ số và dấu gạch dưới.**

Gói dữ liệu cũng có thể là `.zip`, nhưng **trong zip phải là `pack.mcmeta` ngay**, không được bọc thêm một lớp thư mục. Khi nén bằng chuột phải trên thư mục là dễ sinh thêm một lớp nhất.

### 2.2 `pack.mcmeta` và `pack_format`

```json
{
  "pack": {
    "pack_format": 0,
    "description": "My first datapack"
  }
}
```

Về `pack_format`, chỉ có một quy tắc phải nhớ:

:::warn Đừng chép số định dạng trong bất kỳ hướng dẫn nào
Giá trị `pack_format` **thay đổi theo từng phiên bản game**, gói dữ liệu và resource pack mỗi loại có một bộ số riêng. Điền sai thì kết quả là thông báo "định dạng không tương thích", gói sẽ không được nạp.

**Hãy tra bảng định dạng trên wiki chính thức của phiên bản tương ứng**, đừng chép con số trong bất kỳ hướng dẫn nào (kể cả bài này). Số `0` trong ví dụ trên là placeholder, không phải giá trị dùng được.

Ngoài ra, bản thân các trường của `pack.mcmeta` cũng đang tiến hóa: phiên bản mới hơn cho phép khai báo một khoảng định dạng được hỗ trợ (ví dụ các trường kiểu `supported_formats`). Tập trường thay đổi theo phiên bản, lấy trang `pack.mcmeta` trên wiki chính thức làm chuẩn.
:::

### 2.3 Tên thư mục số ít/số nhiều thay đổi theo phiên bản

Đây là cái bẫy người mới dễ vấp nhất, cũng là thứ ít được hướng dẫn nhắc nhất:

| Loại nội dung | Phiên bản sớm hơn (1.20.x trở về trước) | Từ 1.21 |
| --- | --- | --- |
| Hàm | `data/<ns>/functions/` | `data/<ns>/function/` |
| Tiến trình | `data/<ns>/advancements/` | `data/<ns>/advancement/` |
| Bảng chiến lợi phẩm | `data/<ns>/loot_tables/` | `data/<ns>/loot_table/` |
| Công thức | `data/<ns>/recipes/` | `data/<ns>/recipe/` |
| Vị từ (predicate) | `data/<ns>/predicates/` | `data/<ns>/predicate/` |
| Tag hàm | `data/minecraft/tags/functions/` | `data/minecraft/tags/function/` |

Nghĩa là, **từ 1.21 trở đi các thư mục này đổi thành số ít**. Viết số nhiều đúng trên phiên bản cũ, trên phiên bản mới thì là "nội dung không có hiệu lực và không có báo lỗi rõ ràng". Xin lấy wiki chính thức của phiên bản tương ứng làm chuẩn.

### 2.4 Hàm (`.mcfunction`)

- Một hàm là tệp văn bản **mỗi dòng một lệnh**, **đừng viết `/` ở đầu**; dòng bắt đầu bằng `#` là chú thích.
- Hàm gọi được bằng lệnh: `/function my_pack:hello`.
- Phiên bản mới hơn hỗ trợ **macro hàm**: dùng `$(tên)` làm placeholder, rồi dùng `function <hàm> with <nguồn-dữ-liệu>` truyền tham số. Macro là tính năng phụ thuộc phiên bản, trước khi dùng hãy xác nhận phiên bản của bạn hỗ trợ.

```text
# cho người chơi trong 16 ô một chút hiệu ứng hình ảnh
# chú ý: nhất định phải thêm điều kiện lọc, đừng duyệt toàn bộ thực thể mà không lọc
execute as @a[distance=..16] at @s run particle minecraft:flame ~ ~1 ~ 0 0 0 0 1
```

### 2.5 Tag (tags)

Tag dùng để "móc" nội dung vào các hook của game. Hai tag hàm thường dùng nhất:

```json
{
  "values": [
    "my_pack:tick"
  ]
}
```

Khi đặt trong `data/minecraft/tags/function/tick.json` (trước 1.21 là `functions/`), hàm bên trong **thực thi mỗi game tick**; khi đặt trong `load.json`, nó **thực thi một lần khi nạp và khi `/reload`**. Đây là cách làm chuẩn để "cho gói dữ liệu làm việc liên tục", cũng là nguồn gốc phổ biến nhất của vấn đề hiệu năng.

### 2.6 Tiến trình và bảng chiến lợi phẩm

Tiến trình (advancement) thường được dùng như "trigger tự định nghĩa": dùng một điều kiện không thể đạt tự nhiên, rồi phát bằng hàm thủ công, `rewards.function` chỉ định hàm cần gọi. Bảng chiến lợi phẩm (loot table) điều khiển rơi đồ của khối, sinh vật hoặc rương:

```json
{
  "type": "minecraft:generic",
  "pools": [
    {
      "rolls": 1,
      "entries": [
        { "type": "minecraft:item", "name": "minecraft:diamond" }
      ]
    }
  ]
}
```

`type`, điều kiện và tên hàm cụ thể dùng được lấy trang tương ứng trên wiki chính thức làm chuẩn, chúng **mỗi phiên bản đều được thêm hoặc điều chỉnh**.

### 2.7 Kiểm thử: `/reload` và `/datapack list`

```bash
/datapack list
/datapack enable "file/my_pack"
/reload
/function my_pack:hello
```

Điểm chính:

- `/datapack list` là lệnh chẩn đoán đầu tiên để biết "gói rốt cuộc có được nhận ra không";
- `/reload` nạp lại **dữ liệu của các gói dữ liệu đã bật** (hàm, tag, tiến trình, bảng chiến lợi phẩm, công thức…), **không phải khởi động lại**;
- Sinh thế giới, loại chiều, một phần nội dung registry phải **khởi động lại máy chủ** mới có hiệu lực;
- Trên máy chủ lớn, bản thân `/reload` đã có chi phí, đừng coi nó là nút nạp nóng mà dùng liên tục;
- Thêm về định dạng gói, vị trí đặt và tìm lỗi xem [Resource pack và gói dữ liệu](/tutorials/ops/packs).

### 2.8 Cảnh báo hiệu năng: hàm gắn vào tick là "chi phí mỗi tick"

:::warn Mỗi tick thực thi = 20 lần mỗi giây
Gắn hàm vào tag `tick` tức là để nó **thực thi 20 lần mỗi giây**. Bên trong thêm một lệnh, thêm một lần duyệt thực thể không lọc, chi phí đều nhân với 20.

Lỗi hiệu năng thường gặp:

- `execute as @e` không kèm bộ lọc chọn nào, duyệt toàn bộ thực thể cả máy chủ;
- Làm lượng lớn truy vấn khối hoặc `data get` trong hàm chạy mỗi tick;
- Viết logic "kiểu thăm dò" bằng hàm, trong khi có thể thay bằng sự kiện hoặc tag.

Dùng công cụ kiểu `/spark` để định vị lag do hàm gây ra. **Viết đúng trước, tối ưu sau**: để được trong `load` thì đừng để trong `tick`, thêm được điều kiện lọc thì đừng bỏ.
:::

Hai game rule nữa liên quan đến quy mô lệnh cũng đáng biết: `maxCommandChainLength` giới hạn độ dài chuỗi lệnh/đệ quy, và `commandModificationBlockLimit` giới hạn số khối một lệnh được sửa. Giá trị mặc định của cả hai thay đổi theo phiên bản, viết hàm lớn thì tra trước.

## 3. Con đường plugin

Plugin mạnh hơn gói dữ liệu nhiều, cái giá là bạn cần **JDK, công cụ build, một máy chủ kiểm thử**.

### 3.1 Cần chuẩn bị gì

| Cần | Giải thích |
| --- | --- |
| JDK | Phiên bản phải trùng với phiên bản Java mà máy chủ yêu cầu |
| Công cụ build | Maven hoặc Gradle, chọn một là được |
| API của nền tảng đích | Họ Paper dùng Paper API, dùng khi biên dịch, **không đóng gói vào jar của bạn** |
| Một máy chủ kiểm thử | Thư mục riêng, cổng riêng, bản sao thế giới riêng |

Yêu cầu phiên bản Java **thay đổi theo phiên bản game**, các nhánh lõi cũng có thể khác nhau. Quan hệ tương ứng đại khái (**xin lấy tài liệu chính thức của Paper làm chuẩn, đừng chép**):

| Phiên bản Minecraft | Java cần |
| --- | --- |
| 1.16.5 trở về trước | Java 8 |
| 1.17.x | Java 16 |
| 1.18.x - 1.20.4 | Java 17 |
| 1.20.5 trở về sau | Java 21 |

Phiên bản Java của máy chủ và phiên bản `release` dùng khi biên dịch **phải khớp nhau**, nếu không sẽ gặp lỗi khởi động kiểu `UnsupportedClassVersionError`.

### 3.2 Maven: `pom.xml`

```xml
<project xmlns="http://maven.apache.org/POM/4.0.0">
  <modelVersion>4.0.0</modelVersion>
  <groupId>com.example</groupId>
  <artifactId>myplugin</artifactId>
  <version>1.0.0</version>
  <packaging>jar</packaging>
  <properties>
    <maven.compiler.release>21</maven.compiler.release>
    <project.build.sourceEncoding>UTF-8</project.build.sourceEncoding>
  </properties>
  <repositories>
    <repository>
      <id>papermc</id>
      <url>https://repo.papermc.io/repository/maven-public/</url>
    </repository>
  </repositories>
  <dependencies>
    <dependency>
      <groupId>io.papermc.paper</groupId>
      <artifactId>paper-api</artifactId>
      <version>PUT-THE-VERSION-HERE</version>
      <scope>provided</scope>
    </dependency>
  </dependencies>
</project>
```

Ba điểm chính:

- `<scope>provided</scope>` nghĩa là "máy chủ đã cung cấp thư viện này, đừng đóng gói vào jar của tôi". **Dòng này bắt buộc phải viết**, nếu không bạn sẽ đóng cả API vào plugin.
- Cách viết `<version>` tương tự `<phiên bản Minecraft>-R0.1-SNAPSHOT`, **giá trị cụ thể thay đổi theo phiên bản**, hãy tra giá trị hiện tại trong tài liệu hoặc kho chính thức, đừng chép.
- Khi không dùng thư viện bên thứ ba thì **đừng đưa plugin shade vào**. Đóng gói thư viện của người khác sẽ gây xung đột, cũng dễ vấp vấn đề giấy phép.

### 3.3 Gradle: `build.gradle`

```groovy
plugins {
    id 'java'
}
group = 'com.example'
version = '1.0.0'
repositories {
    mavenCentral()
    maven {
        name = 'papermc'
        url = 'https://repo.papermc.io/repository/maven-public/'
    }
}
dependencies {
    compileOnly 'io.papermc.paper:paper-api:PUT-THE-VERSION-HERE'
}
java {
    toolchain {
        languageVersion = JavaLanguageVersion.of(21)
    }
}
tasks.withType(JavaCompile).configureEach {
    options.encoding = 'UTF-8'
}
```

`compileOnly` chính là `provided` trong Gradle: **thấy được khi biên dịch, không gồm khi đóng gói**. Sản phẩm build ở `build/libs/`.

### 3.4 `plugin.yml` và `api-version`

```yaml
name: MyPlugin
version: 1.0.0
main: com.example.myplugin.MyPlugin
api-version: '1.21'
author: YourName
description: An example plugin.
commands:
  hello:
    description: Says hello.
    usage: /hello
    permission: myplugin.hello
permissions:
  myplugin.hello:
    description: Allows the use of /hello
    default: op
```

| Trường | Tác dụng |
| --- | --- |
| `name` | Tên plugin, dùng làm tiền tố nhật ký và tên thư mục dữ liệu; đừng có dấu cách |
| `main` | **Tên lớp đầy đủ** của lớp chính (kèm tên gói), lớp đó phải kế thừa `JavaPlugin` |
| `version` | Phiên bản plugin, xuất hiện trong nhật ký và `/plugins` |
| `api-version` | Khai báo plugin được viết theo phiên bản API nào |

**Vì sao `api-version` quan trọng**: máy chủ dựa vào đó để quyết định nạp plugin của bạn theo chế độ nào. Tài liệu chính thức nói rằng —— **khi phiên bản máy chủ thấp hơn phiên bản API mà plugin khai báo, máy chủ sẽ từ chối nạp**; còn **khi không điền trường này, plugin sẽ được nạp theo kiểu cũ (legacy) và in cảnh báo**. Nó còn ảnh hưởng một số hành vi chuyển đổi tương thích, nên plugin mới nên điền rõ ràng.

Nó **không phải** bảo đảm phiên bản: viết `api-version` chỉ nghĩa là bạn đã khai báo phiên bản đích, không có nghĩa mã của bạn nhất định bình thường trên phiên bản mới. Paper mới hơn còn hỗ trợ một loại tệp manifest khác (`paper-plugin.yml`) và mô hình nạp plugin khác, cách viết cụ thể lấy tài liệu chính thức của phiên bản tương ứng làm chuẩn.

### 3.5 Vòng đời: `onEnable` và `onDisable`

```text
package com.example.myplugin;

import org.bukkit.plugin.java.JavaPlugin;

public final class MyPlugin extends JavaPlugin {
    @Override
    public void onEnable() {
        saveDefaultConfig();
        getServer().getPluginManager().registerEvents(new PlayerJoinListener(this), this);
        getLogger().info("MyPlugin enabled.");
    }
    @Override
    public void onDisable() {
        getLogger().info("MyPlugin disabled.");
    }
}
```

- `onEnable()` được gọi khi plugin được bật. Khi máy chủ khởi động, nó xảy ra sau khi máy chủ tự khởi tạo, trước khi người chơi vào được.
- **Đừng làm thao tác chặn tốn thời gian trong `onEnable()`** (tải tệp, kết nối dịch vụ từ xa, duyệt cả thế giới), việc đó sẽ trực tiếp làm chậm khởi động máy chủ.
- Trong `onDisable()` nên lưu cấu hình, hủy các tác vụ bạn tự lên lịch, đóng tài nguyên bạn đã mở.
- Khi tắt plugin, máy chủ **tự động hủy đăng ký listener và hủy tác vụ do plugin đó lên lịch**, nhưng **không** lưu dữ liệu hay đóng tệp, kết nối bạn đã mở thay bạn.

### 3.6 Đăng ký lệnh và listener

Bộ thực thi lệnh:

```text
package com.example.myplugin;

import org.bukkit.command.Command;
import org.bukkit.command.CommandExecutor;
import org.bukkit.command.CommandSender;

public final class HelloCommand implements CommandExecutor {
    private final MyPlugin plugin;
    public HelloCommand(MyPlugin plugin) {
        this.plugin = plugin;
    }
    @Override
    public boolean onCommand(CommandSender sender, Command command, String label, String[] args) {
        sender.sendMessage("Hello, " + sender.getName() + "!");
        return true;
    }
}
```

- Giá trị trả về biểu thị "lệnh này có được xử lý đúng không": trả `false` thì máy chủ sẽ in `usage` của lệnh đó.
- Nhớ kiểm tra `args.length`, nếu không người chơi gõ thiếu một tham số là ném lỗi vượt mảng.
- Cần gợi ý hoàn thành thì hiện thực `TabCompleter` và đăng ký bằng `setTabCompleter(...)`.

Listener sự kiện:

```text
package com.example.myplugin;

import org.bukkit.entity.Player;
import org.bukkit.event.EventHandler;
import org.bukkit.event.Listener;
import org.bukkit.event.player.PlayerJoinEvent;

public final class PlayerJoinListener implements Listener {
    private final MyPlugin plugin;
    public PlayerJoinListener(MyPlugin plugin) {
        this.plugin = plugin;
    }
    @EventHandler
    public void onPlayerJoin(PlayerJoinEvent event) {
        Player player = event.getPlayer();
        player.sendMessage("Welcome to the server!");
    }
}
```

Đăng ký listener **bắt buộc** phải gọi `registerEvents(listener, plugin)`, chỉ hiện thực `Listener` là không đủ. Khi gắn lệnh trong `onEnable()`, nhớ kiểm tra null:

```text
if (getCommand("hello") == null) {
    getLogger().severe("Command 'hello' is missing from plugin.yml!");
    return;
}
getCommand("hello").setExecutor(new HelloCommand(this));
```

**`getCommand()` sẽ trả `null` khi lệnh chưa được viết vào `plugin.yml`**, gọi thẳng `setExecutor` là khởi động là sập. Đây là lần sập đầu tiên phổ biến nhất của người mới. Paper phiên bản mới hơn cung cấp cách đăng ký lệnh dựa trên Brigadier (đăng ký qua sự kiện vòng đời), thân thiện hơn với lệnh phức tạp; nó thuộc API riêng của nền tảng, cách viết thay đổi theo phiên bản, xin lấy tài liệu chính thức làm chuẩn.

### 3.7 Nhật ký: dùng `getLogger()`

```text
getLogger().info("Loaded " + count + " entries.");
getLogger().warning("Config value is missing, using the default.");
getLogger().log(java.util.logging.Level.WARNING, "Failed to save data", exception);
```

- `getLogger()` trả về một logger có tên plugin làm tiền tố, nhật ký sẽ vào console máy chủ và tệp nhật ký.
- **Đừng nuốt ngoại lệ**: bắt xong ít nhất phải `log` ra, kèm đối tượng ngoại lệ, nếu không khi tìm lỗi chỉ còn một câu "có lỗi rồi".
- Đừng dùng `System.out.println`: nó vòng qua hệ thống nhật ký, mất tên plugin và mức độ, cũng không bị công cụ nhật ký lọc được. Paper mới hơn còn cung cấp logger kiểu SLF4J, cách viết lấy tài liệu chính thức làm chuẩn.

### 3.8 Build và triển khai

```bash
mvn -q package          # Maven, sản phẩm ở target/
gradle build            # Gradle, sản phẩm ở build/libs/
```

Các bước triển khai:

```bash
stop                                              # thực thi trong console máy chủ kiểm thử
cp target/myplugin-1.0.0.jar /path/to/testserver/plugins/
java -Xms2G -Xmx2G -jar paper.jar --nogui         # khởi động lại rồi xem nhật ký onEnable và trạng thái /plugins
```

Chú ý hai điểm:

- Nếu bạn dùng plugin kiểu shade, jar bắt đầu bằng `original-` **không phải** tệp cần triển khai.
- **Đừng dùng `/reload` để nạp nóng plugin.** Nạp nóng plugin không phải cách dùng được hỗ trợ, rất dễ để lại trạng thái, rò rỉ class loader, cuối cùng biểu hiện thành đủ loại vấn đề kỳ lạ. Giai đoạn phát triển thì khởi động lại thẳng máy chủ kiểm thử.

## 4. Học API ở đâu

Đây là mục bài này muốn nhấn mạnh nhất: **đừng viết tên phương thức theo trí nhớ.**

| Nguồn | Công dụng |
| --- | --- |
| Trang tài liệu Paper chính thức | Hướng dẫn nhập môn, cách viết được khuyến nghị cho sự kiện và lệnh, mô tả đặc điểm nền tảng |
| Javadoc Paper chính thức | **Nguồn có thẩm quyền duy nhất** về tên phương thức và tên lớp, xem được theo phiên bản đích của bạn |
| Javadoc của Bukkit / Spigot | Tham khảo cho API cơ bản, phần lớn API của Paper tương thích với nó |
| Kho và tài liệu chính thức của lõi bạn dùng | Xác nhận một hành vi là riêng của Paper hay Bukkit dùng chung |

Cách làm cụ thể:

1. Xác định trước bạn **phát triển cho phiên bản Minecraft nào**, rồi chọn phiên bản tương ứng trong Javadoc.
2. Muốn dùng một chức năng nào, **trước hết tìm ra lớp đó trong Javadoc**, xác nhận chữ ký phương thức, rồi mới viết mã.
3. **Tên lớp, tên sự kiện, giá trị enum đều thay đổi theo phiên bản**, cách viết trong blog và hướng dẫn cũ thường đã hết hiệu lực.
4. **Phân biệt API và hiện thực nội bộ**: `org.bukkit.*`, `io.papermc.paper.*` là API có cam kết tương thích; lớp nội bộ của máy chủ (thường gọi là NMS) **không có bất kỳ bảo đảm tương thích nào**, dùng nó tức là trói plugin chết vào một phiên bản.
5. Gặp lỗi biên dịch "phương thức không tồn tại", hãy nghi phiên bản không đúng trước, đừng đi tìm một cách viết thay thế biên dịch được.

## 5. Kỷ luật kiểm thử

Sự cố dễ xảy ra nhất khi phát triển plugin không phải viết không ra, mà là **thử trên máy chủ production**.

| Kỷ luật | Giải thích |
| --- | --- |
| Dùng máy chủ kiểm thử riêng | Thư mục riêng, cổng riêng, thế giới dùng bản sao, **đừng bao giờ lấy máy chủ chính làm sân thử** |
| Căn khớp môi trường | **Phiên bản lõi, số build, phiên bản Java** của máy chủ kiểm thử phải giống production, nếu không bạn đo không phải cùng một môi trường |
| Sao lưu thế giới trước | Plugin sẽ đổi dữ liệu, có vấn đề thì sao lưu là đường lui duy nhất, xem [Sao lưu và khôi phục](/tutorials/java/backup) |
| Mỗi lần chỉ đổi một thứ | Đồng thời đổi plugin, cấu hình và phiên bản lõi thì có vấn đề không định vị được |
| Đọc stack trace ở console | Khi sập xem **dòng đầu + chuỗi `Caused by` + dòng có tên gói của bạn**, cách làm xem [Lỗi thường gặp và tìm nguyên nhân sập của Java Edition](/tutorials/faq/errors) |
| Thử một lượt bằng tài khoản người chơi thường | Bug liên quan quyền chỉ có tài khoản không OP mới đo ra được |
| Thử dần trước khi lên sóng | Bật ở máy chủ nhỏ hoặc giờ thấp điểm trước, quan sát TPS và nhật ký |

## 6. Nhắc nhở an toàn

**Plugin không phải sandbox.** Một plugin chạy trong cùng JVM với máy chủ, có toàn bộ quyền của máy chủ: đọc ghi tệp, mở kết nối mạng, thực thi lệnh hệ thống, truy cập dữ liệu trong bộ nhớ. Nền tảng không giới hạn nó.

Từ đó suy ra ba kết luận:

- **Backdoor trong plugin của người khác chính là backdoor trên máy của bạn.** Chỉ lấy plugin từ kênh phát hành chính thức, để ý bản bị đóng gói lại, đổi tên, bọc shell.
- **Gói dữ liệu cũng vậy.** Một hàm làm được mọi thứ lệnh làm được: phát vật phẩm, dịch chuyển người chơi, xóa sạch vật chứa, ném người chơi vào hư không. Chỉ cài gói từ nguồn tin được.
- **Plugin của chính bạn cũng đừng tin đầu vào của người chơi.** Kiểm tra tham số lệnh, đừng ghép thẳng chuỗi do người chơi cung cấp làm đường dẫn tệp, đừng thực thi chuỗi trong cấu hình như mã, chú ý escape văn bản gửi cho người chơi.

Quy trình cài đặt, kiểm toán và loại bỏ lỗi của plugin xem [Quản lý plugin và loại bỏ lỗi](/tutorials/java/plugin-manage).

## 7. Tóm lại

- **Chọn công cụ trước**: gói dữ liệu → plugin → mod, dùng được cái đơn giản thì đừng dùng cái phức tạp.
- Gói dữ liệu **ngưỡng thấp nhất**: số định dạng của `pack.mcmeta` bắt buộc tra bảng chính thức, tên thư mục số ít/số nhiều thay đổi theo phiên bản.
- Plugin cần **JDK + công cụ build + máy chủ kiểm thử**; khi biên dịch dùng `provided` / `compileOnly` tham chiếu API, **đừng đóng gói API**.
- Trong `plugin.yml`, **`api-version` quyết định chế độ nạp**, không điền sẽ bị coi là plugin kiểu cũ và cảnh báo; lệnh bắt buộc phải viết vào `plugin.yml`, nếu không `getCommand()` trả `null`.
- **Trong `onEnable` đừng làm thao tác tốn thời gian**, trong `onDisable` lưu trạng thái và giải phóng tài nguyên.
- **Tên phương thức lấy Javadoc chính thức làm chuẩn**, tên lớp và tên sự kiện thay đổi theo phiên bản.
- **Phát triển luôn ở máy chủ kiểm thử**, mỗi lần chỉ đổi một thứ, sập thì đọc stack trace trước.
- **Plugin có toàn bộ quyền của máy chủ**, plugin không rõ nguồn gốc chính là backdoor không rõ nguồn gốc.

:::tip Cách học nhanh nhất: đọc một plugin mã nguồn mở có sẵn
Tự nghĩ từ số không "tôi nên gọi phương thức nào" là con đường chậm nhất. Cách nhanh hơn là: tìm một **plugin mã nguồn mở có chức năng giống mục tiêu của bạn**, đọc `plugin.yml`, lớp chính, một lớp lệnh và một lớp listener của nó, chép bộ khung tối thiểu ra, sửa thành chức năng bạn muốn. Bạn sẽ học được trong nửa giờ nhiều hơn là đọc mười bài hướng dẫn.

Đọc thì mang theo ba câu hỏi: **nó đăng ký cái gì ở giai đoạn vòng đời nào, nó xử lý đầu vào của người chơi thế nào, nó lưu dữ liệu ở đâu.** Rõ ba điểm này là cửa phát triển plugin mở ra.
:::

Bài đọc liên quan: [Resource pack và gói dữ liệu](/tutorials/ops/packs) (định dạng gói và vị trí đặt), [Cơ bản plugin](/tutorials/java/plugins) (cài đặt và nạp), [Quản lý plugin và loại bỏ lỗi](/tutorials/java/plugin-manage), [Lỗi thường gặp và tìm nguyên nhân sập của Java Edition](/tutorials/faq/errors), [Sao lưu và khôi phục](/tutorials/java/backup).

> Cơ chế game, API và phiên bản định dạng gói lấy tài liệu chính thức tương ứng làm chuẩn.
