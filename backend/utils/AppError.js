class AppError extends Error { // inherting from built-in Error class 
  constructor(message, statusCode) { 
    super(message); // calling the parent constructor with the error message

    this.statusCode = statusCode;

    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
    // 4xx → client → "fail"
    // 5xx → server → "error"

    this.isOperational = true;
    // true = lỗi dự đoán trước được
    // user nhập sai
    // không tìm thấy data
    // false = lỗi bug hệ thống
    // null pointer
    // crash logic

    // Quyết định có nên show error cho client hay không
    // Tránh leak thông tin nhạy cảm

    Error.captureStackTrace(this, this.constructor); // static method of Error 
      // Xóa phần stack trace liên quan tới constructor
      // Giữ stack sạch hơn, dễ debug
      // Gắn stack trace vào this, nhưng BỎ QUA this.constructor trong stack

      // Ví dụ:
      // Không có dòng này → stack sẽ có cả AppError
      // Có dòng này → stack bắt đầu từ chỗ throw
  }
}

module.exports = AppError;