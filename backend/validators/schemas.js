const { z } = require('zod');

const GoogleAuthSchema = z.object({
  id_token: z.string().optional(),
  email: z.string().email().optional(),
  name: z.string().optional(),
  role: z.enum(['admin', 'member']).optional()
});

const CreateMatchSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Ngày phải theo định dạng YYYY-MM-DD'),
  time: z.string().regex(/^\d{2}:\d{2}$/, 'Giờ phải theo định dạng HH:mm'),
  stadium: z.string().min(1, 'Tên sân không được để trống'),
  stadiumLink: z.string().optional(),
  pitchCost: z.number().min(0, 'Tiền sân không được âm'),
  deal: z.string().optional().default('5-5'),
  kitColor: z.enum(['xanh dương', 'xanh', 'đỏ', 'đen', '']).optional(),
  opponent: z.object({
    teamName: z.string().optional(),
    phone: z.string().optional(),
    fbLink: z.string().optional()
  }).optional(),
  notes: z.string().optional()
});

const CheckInSchema = z.object({
  status: z.enum(['joined', 'uncertain', 'absent'], {
    errorMap: () => ({ message: 'Trạng thái điểm danh phải là joined, uncertain hoặc absent' })
  }),
  reason: z.string().optional()
});

const CreateFinanceSchema = z.object({
  type: z.enum(['IN', 'OUT']),
  category: z.enum(['quy_thang', 'tien_san', 'nuoc_uong', 'dong_phuc', 'phat', 'khac']).optional(),
  amount: z.number().positive('Số tiền phải lớn hơn 0'),
  description: z.string().min(1, 'Mô tả không được để trống'),
  userId: z.string().optional().nullable(),
  fundMonth: z.string().optional().nullable(),
  matchId: z.string().optional().nullable(),
  proofImage: z.string().optional()
});

const BulkUpdateFinanceSchema = z.object({
  updates: z.array(z.object({
    _id: z.string().min(1),
    type: z.enum(['IN', 'OUT']).optional(),
    category: z.string().optional(),
    amount: z.number().positive().optional(),
    description: z.string().optional(),
    fundMonth: z.string().optional().nullable(),
    proofImage: z.string().optional()
  })).min(1, 'Danh sách cập nhật không được rỗng')
});

const OpponentExtractSchema = z.object({
  teamName: z.string().nullable(),
  stadiumName: z.string().nullable().optional(),
  matchTime: z.string().regex(/^\d{2}:\d{2}$/).nullable(),
  matchDay: z.string().nullable(),
  homeArea: z.string().nullable(),
  level: z.enum(['Mềm', 'Trung bình', 'Cứng', 'Chưa rõ']).nullable(),
  contactPhone: z.string().nullable().optional()
});

module.exports = {
  GoogleAuthSchema,
  CreateMatchSchema,
  CheckInSchema,
  CreateFinanceSchema,
  BulkUpdateFinanceSchema,
  OpponentExtractSchema
};
