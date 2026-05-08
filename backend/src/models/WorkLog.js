import mongoose from "mongoose";

const workLogSchema = new mongoose.Schema(
  {
    date: {
      type: Date,
      required: true,
      index: true
    },
    time: {
      type: String,
      required: true,
      match: /^([01]\d|2[0-3]):[0-5]\d$/
    },
    employeeUsername: {
      type: String,
      required: true,
      trim: true,
      index: true
    },
    employeeNickname: {
      type: String,
      required: true,
      trim: true,
      index: true
    },
    recipient: {
      type: String,
      trim: true,
      default: ""
    },
    dutyGroup: {
      type: String,
      enum: ["main", "secondary", "other", null],
      default: null,
      index: true
    },
    mainDuty: {
      type: String,
      required: true,
      trim: true,
      index: true
    },
    minorTask: {
      type: String,
      trim: true,
      default: "",
      index: true
    },
    comment: {
      type: String,
      trim: true,
      default: ""
    },
    status: {
      type: String,
      trim: true,
      default: "บันทึกแล้ว",
      index: true
    },
    source: {
      type: String,
      enum: ["manual", "excel-seed"],
      default: "manual",
      index: true
    },
    sourceRow: {
      type: Number,
      default: null
    }
  },
  {
    timestamps: true
  }
);

workLogSchema.index({ date: 1, employeeUsername: 1 });
workLogSchema.index({ mainDuty: 1, minorTask: 1 });

workLogSchema.methods.toJSON = function toJSON() {
  return {
    id: this._id.toString(),
    date: this.date.toISOString().slice(0, 10),
    time: this.time,
    employeeUsername: this.employeeUsername,
    employeeNickname: this.employeeNickname,
    recipient: this.recipient,
    dutyGroup: this.dutyGroup,
    mainDuty: this.mainDuty,
    minorTask: this.minorTask,
    comment: this.comment,
    status: this.status,
    source: this.source,
    sourceRow: this.sourceRow,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt
  };
};

export const WorkLog = mongoose.model("WorkLog", workLogSchema);
