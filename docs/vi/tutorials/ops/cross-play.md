---
title: Bảng tra nhanh chơi chéo Java và Bedrock Edition
slug: cross-play
cat: ops
level: 2
order: 30
minutes: 8
tags: [chơi chéo, Bedrock Edition, Geyser, Floodgate, chơi nhiều người, cổng]
updated: 2026-10-04
draft: false
---

Nhiều người chơi muốn dùng client Bedrock Edition vào máy chủ Java Edition. Chúng tôi gom cả quy trình thành một trang tra nhanh.

## Điểm chính

:::step Nguyên lý
Geyser chuyển giao thức Bedrock Edition thành giao thức Java Edition, còn Floodgate giúp người chơi Bedrock hoàn tất xác thực đăng nhập mà không cần tài khoản Java.
:::

:::step Cài ở đâu
Cài được ở phía proxy (Velocity, BungeeCord), cũng cài được trên một máy chủ Paper đơn. Cài ở phía proxy tiện quản lý tập trung hơn.
:::

:::step Cổng cần mở
Java Edition mặc định dùng TCP 25565, Bedrock Edition mặc định dùng UDP 19132. Tường lửa và nhóm bảo mật máy chủ cloud cả hai chỗ đều phải mở.
:::

:::danger
Đừng tắt xác thực bản quyền trên máy chủ công khai để "giải quyết" vấn đề đăng nhập, làm vậy tức là cho bất kỳ ai dùng tên bất kỳ vào máy chủ. Cách đúng là cấu hình Floodgate cho tốt.
:::

Các bước đầy đủ xem "Hỗ trợ người chơi trên điện thoại".
