# Design.md — Sofascore Website

## 1. Tổng quan
Sofascore là nền tảng theo dõi tỷ số thể thao trực tiếp (bóng đá, tennis, bóng rổ...). Giao diện tập trung vào mật độ thông tin cao, cập nhật real-time, tối ưu cho việc quét nhanh nhiều trận đấu cùng lúc.

## 2. Bảng màu (Color Palette)
- Nền trang (body background): `rgb(237, 241, 246)` — xám xanh rất nhạt, giúp các card nổi bật.
- Chữ chính: `rgb(34, 34, 38)` — gần đen, độ tương phản cao, dễ đọc.
- Thanh điều hướng (header) nền: `rgb(44, 62, 196)` — xanh dương đậm (indigo/blue) là màu thương hiệu chính.
- Màu nhấn / nút hành động chính (primary button): `rgb(55, 77, 245)` — xanh dương sáng hơn header, dùng cho nút bo tròn pill.
- Chữ trên nền tối: `rgb(255, 255, 255)` — trắng.
- Trạng thái "Live": tông đỏ (badge đỏ nổi bật trong danh sách trận đấu và thanh trending).
- Liên kết mặc định: `rgb(0, 0, 238)` — xanh dương chuẩn của trình duyệt cho một số thẻ `<a>` chưa style riêng.

## 3. Typography
- Font chính: **"Sofascore Sans"** (font tuỳ chỉnh của thương hiệu), fallback: Arial Unicode MS, -apple-system, BlinkMacSystemFont, Segoe UI, Helvetica, Arial, sans-serif.
- Cỡ chữ cơ bản (body): 16px, font-weight 400.
- Nút bấm (button): cỡ chữ nhỏ hơn ~12px, font-weight 500 (đậm vừa) để nổi bật trên nền màu.
- Hệ thống chữ ưu tiên rõ ràng, gọn, tối ưu cho bảng số liệu và danh sách dày đặc.

## 4. Bo góc & hình khối (Shape)
- Nút bấm dùng bo góc lớn dạng "pill": `border-radius: 24px`.
- Card/khối nội dung (lịch thi đấu, bảng chuyển nhượng, banner quảng cáo) dùng góc bo nhẹ, nền trắng nổi trên nền xám xanh của trang.

## 5. Bố cục (Layout)
Trang chủ chia thành các vùng chính:

1. **Thanh trending / ticker** (trên cùng): dải ngang cuộn ngang hiển thị các trận đấu nổi bật, tỉ số trực tiếp — nền tối, chữ trắng, cập nhật liên tục.
2. **Header chính**: nền xanh dương đậm, gồm logo "Sofascore", các tab điều hướng dạng nút pill (SCORES, NEWS, FANTASY, TORNEO), ô tìm kiếm bên phải, biểu tượng tia sét (live) và tài khoản người dùng.
3. **Thanh danh mục thể thao**: hàng ngang các môn thể thao (Football, Tennis, Basketball, Baseball, Volleyball, More...), cùng các liên kết phụ (Dropping odds, Favourites, TV schedule) căn phải.
4. **Bố cục 3 cột (desktop, ≥ khoảng 1200px)**:
   - Cột trái: danh sách giải đấu & trận đấu theo ngày, có tab lọc (All / Favourites / Competitions) và bộ lọc trạng thái (Live / Finished / Upcoming) cùng công tắc hiển thị kèo (Odds).
   - Cột giữa: khối nổi bật (trận đấu nổi bật kèm widget bình chọn "Who will win?", bảng kèo nhà cái, danh sách chuyển nhượng nổi bật).
   - Cột phải: banner quảng cáo / giới thiệu tính năng ứng dụng di động kèm mã QR.
5. **Responsive**: ở màn hình nhỏ, thanh danh mục và các cột có xu hướng thu gọn thành dạng cuộn ngang hoặc xếp chồng (dựa trên các class dạng `md:`, `lgDown:` quan sát được trong mã nguồn, cho thấy hệ thống dùng breakpoint theo kiểu utility-first CSS, tương tự Tailwind).

## 6. Thành phần giao diện (Components)
- **Nút (Button)**: 2 biến thể chính quan sát được — `filled` (nền đặc, dùng cho hành động chính/tab đang chọn) và `clear` (trong suốt, dùng cho tab chưa chọn trên nền màu).
- **Card trận đấu**: mỗi dòng gồm giờ thi đấu, cờ/logo giải đấu, tên hai đội, tỉ số, biểu tượng mũi tên mở rộng và icon ngôi sao (đánh dấu yêu thích).
- **Bảng kèo nhà cái (Odds table)**: hiển thị dạng hàng với 3 cột tỉ lệ (1 / X / 2), có icon nhà cái kèm mũi tên tăng/giảm tỉ lệ.
- **Widget bình chọn**: 3 nút lựa chọn (đội 1 / hòa / đội 2) dạng outline bo tròn.
- **Banner quảng cáo**: khối nền tối, hình minh hoạ ứng dụng, kèm mã QR và bullet point ngắn gọn.

## 7. Icon & hình ảnh
- Sử dụng logo/cờ nhỏ cho từng đội, giải đấu.
- Icon hệ thống (ngôi sao yêu thích, tia sét, kính lúp tìm kiếm, mũi tên) theo phong cách outline đơn giản, đơn sắc, đồng bộ với màu chữ.

## 8. Nguyên tắc thiết kế tổng thể
- Ưu tiên **mật độ thông tin**: nhiều trận đấu, nhiều số liệu hiển thị đồng thời mà vẫn giữ được sự rõ ràng nhờ khoảng trắng giữa các dòng và phân nhóm theo giải đấu.
- Màu xanh dương thương hiệu xuyên suốt ở header, nút chính, liên kết — tạo tính nhất quán.
- Tương phản nền trắng (card) trên nền xám xanh nhạt (trang) giúp phân lớp nội dung rõ ràng.
- Thiết kế hướng thao tác nhanh: tab lọc, công tắc bật/tắt (odds), biểu tượng yêu thích luôn đặt gần nội dung tương ứng để giảm thao tác của người dùng.

---
*Tài liệu này được tổng hợp từ việc quan sát trực tiếp giao diện và mã nguồn CSS của trang sofascore.com tại thời điểm khảo sát, mang tính chất mô tả lại design system hiện có, không phải tài liệu chính thức từ Sofascore.*
