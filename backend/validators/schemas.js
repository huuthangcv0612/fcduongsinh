const { z } = require('zod');

const GoogleAuthSchema = z.object({
  id_token: z.string().optional(),
  email: z.string().email().optional(),
  name: z.string().optional(),
  role: z.enum(['admin', 'member']).optional()
});

const CreateMatchSchema = z.object({
  matchType: z.enum(['friendly', 'internal']).optional().default('friendly'),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Ngày phải theo định dạng YYYY-MM-DD'),
  time: z.string().regex(/^\d{2}:\d{2}$/, 'Giờ phải theo định dạng HH:mm'),
  stadium: z.string().min(1, 'Tên sân không được để trống'),
  stadiumLink: z.string().optional(),
  pitchCost: z.number().min(0, 'Tiền sân không được âm').optional().default(0),
  serviceCost: z.number().min(0, 'Tiền dịch vụ không được âm').optional().default(0),
  guestPlayers: z.number().min(0, 'Số thành viên vãng lai không được âm').optional().default(0),
  guestPlayersA: z.number().min(0, 'Số thành viên vãng lai Team A không được âm').optional().default(0),
  guestPlayersB: z.number().min(0, 'Số thành viên vãng lai Team B không được âm').optional().default(0),
  deal: z.string().optional().default('5-5'),
  kitColor: z.string().optional(),
  opponent: z.object({
    teamName: z.string().optional(),
    phone: z.string().optional(),
    fbLink: z.string().optional()
  }).optional(),
  internalTeams: z.object({
    teamA: z.object({
      name: z.string().optional(),
      kitColor: z.string().optional(),
      guestPlayers: z.number().min(0).optional(),
      players: z.array(z.string()).optional()
    }).optional(),
    teamB: z.object({
      name: z.string().optional(),
      kitColor: z.string().optional(),
      guestPlayers: z.number().min(0).optional(),
      players: z.array(z.string()).optional()
    }).optional()
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
  category: z.enum(['quy_tran', 'quy_thang', 'tien_san', 'nuoc_uong', 'dich_vu', 'dong_phuc', 'phat', 'khac']).optional(),
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
