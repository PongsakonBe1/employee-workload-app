import { collection, query, where, getDocs, addDoc, updateDoc, deleteDoc, doc, serverTimestamp, orderBy } from "firebase/firestore";
import { db } from "./firebase";

/**
 * ดึง templates ทั้งหมด (admin ใช้)
 * @param {string} department - กรองตาม department (optional)
 * @returns {Promise<Array>} - array ของ templates
 */
export async function getAllTemplates(department = null) {
  try {
    const constraints = [];
    
    if (department) {
      constraints.push(where("department", "==", department));
    }
    
    constraints.push(where("isActive", "==", true));
    constraints.push(orderBy("name", "asc"));
    
    const q = query(collection(db, "globalTemplates"), ...constraints);
    const snapshot = await getDocs(q);
    
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error("Error getting templates:", error);
    throw error;
  }
}

/**
 * ดึง templates สำหรับ user (staff ใช้)
 * @param {string} userDepartment - department ของ user
 * @returns {Promise<Array>} - array ของ templates
 */
export async function getTemplatesForUser(userDepartment) {
  try {
    // ดึง global templates (department = null)
    const globalQuery = query(
      collection(db, "globalTemplates"),
      where("department", "==", null),
      where("isActive", "==", true),
      orderBy("usageCount", "desc"),
      orderBy("name", "asc")
    );
    
    // ดึง department-specific templates (ถ้ามี department)
    let deptQuery = null;
    if (userDepartment) {
      deptQuery = query(
        collection(db, "globalTemplates"),
        where("department", "==", userDepartment),
        where("isActive", "==", true),
        orderBy("usageCount", "desc"),
        orderBy("name", "asc")
      );
    }
    
    const [globalSnapshot, deptSnapshot] = await Promise.all([
      getDocs(globalQuery),
      deptQuery ? getDocs(deptQuery) : Promise.resolve({ docs: [] })
    ]);
    
    const globalTemplates = globalSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    const deptTemplates = deptSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    // รวม global + department templates (global ก่อน)
    return [...globalTemplates, ...deptTemplates];
  } catch (error) {
    console.error("Error getting user templates:", error);
    throw error;
  }
}

/**
 * สร้าง template ใหม่ (admin ใช้)
 * @param {Object} templateData - ข้อมูล template
 * @returns {Promise<string>} - template ID
 */
export async function createTemplate(templateData) {
  try {
    const docRef = await addDoc(collection(db, "globalTemplates"), {
      name: templateData.name,
      minorTask: templateData.minorTask,
      mainDuty: templateData.mainDuty,
      dutyGroup: templateData.dutyGroup || "main",
      comment: templateData.comment || "",
      department: templateData.department || null,
      requireRecipient: templateData.requireRecipient || false,
      requireComment: templateData.requireComment || false,
      isSmart: templateData.isSmart || false,
      isActive: true,
      usageCount: 0,
      createdAt: serverTimestamp(),
      createdBy: templateData.createdBy
    });
    
    return docRef.id;
  } catch (error) {
    console.error("Error creating template:", error);
    throw error;
  }
}

/**
 * อัปเดต template (admin ใช้)
 * @param {string} templateId - ID ของ template
 * @param {Object} updateData - ข้อมูลที่จะอัปเดต
 * @returns {Promise<void>}
 */
export async function updateTemplate(templateId, updateData) {
  try {
    const docRef = doc(db, "globalTemplates", templateId);
    await updateDoc(docRef, {
      ...updateData,
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    console.error("Error updating template:", error);
    throw error;
  }
}

/**
 * ลบ template (admin ใช้)
 * @param {string} templateId - ID ของ template
 * @returns {Promise<void>}
 */
export async function deleteTemplate(templateId) {
  try {
    const docRef = doc(db, "globalTemplates", templateId);
    await deleteDoc(docRef);
  } catch (error) {
    console.error("Error deleting template:", error);
    throw error;
  }
}

/**
 * บันทึกการใช้ template (เพิ่ม usageCount)
 * @param {string} templateId - ID ของ template
 * @returns {Promise<void>}
 */
export async function recordTemplateUsage(templateId) {
  try {
    const docRef = doc(db, "globalTemplates", templateId);
    await updateDoc(docRef, {
      usageCount: increment(1),
      lastUsedAt: serverTimestamp()
    });
  } catch (error) {
    console.error("Error recording template usage:", error);
    // ไม่ throw error เพราะไม่ควร block การบันทึกงาน
  }
}

/**
 * บันทึกงานจาก template (staff ใช้)
 * @param {string} templateId - ID ของ template
 * @param {string} userId - ID ของ user
 * @param {Object} extraData - ข้อมูลเพิ่มเติม (date, time)
 * @returns {Promise<string>} - worklog ID
 */
export async function logFromTemplate(templateId, userId, extraData) {
  try {
    // ดึงข้อมูล template
    const templateDoc = await getDoc(doc(db, "globalTemplates", templateId));
    if (!templateDoc.exists()) {
      throw new Error("Template not found");
    }
    
    const template = templateDoc.data();
    
    // สร้าง worklog ใหม่
    const worklogData = {
      employeeId: userId,
      employeeDisplayName: extraData.employeeDisplayName || "",
      employeeNickname: extraData.employeeNickname || "",
      employeeFullName: extraData.employeeFullName || "",
      date: extraData.date || new Date().toISOString().slice(0, 10),
      time: extraData.time || new Date().toTimeString().slice(0, 5),
      recipient: extraData.recipient || "",
      dutyGroup: template.dutyGroup,
      mainDuty: template.mainDuty,
      minorTask: extraData.minorTask || template.minorTask, // ใช้ minorTask จาก extraData ถ้ามี
      comment: extraData.comment || template.comment, // ใช้ comment จาก extraData ถ้ามี
      equipment: extraData.equipment || "", // เพิ่ม equipment field
      room: extraData.room || "", // เพิ่ม room field
      templateId: templateId, // บันทึกว่ามาจาก template
      createdAt: serverTimestamp()
    };
    
    const worklogRef = await addDoc(collection(db, "worklogs"), worklogData);
    
    // บันทึกการใช้ template
    await recordTemplateUsage(templateId);
    
    return worklogRef.id;
  } catch (error) {
    console.error("Error logging from template:", error);
    throw error;
  }
}

// Import increment function
import { increment } from "firebase/firestore";
import { getDoc } from "firebase/firestore";

/**
 * บันทึกงานจาก Combo Template (หลายงานพร้อมกัน)
 * @param {string} templateId - ID ของ combo template
 * @param {string} userId - ID ของ user
 * @param {Object} extraData - ข้อมูลเพิ่มเติม (date, time, recipient)
 * @returns {Promise<Array>} - array ของ worklog IDs
 */
export async function logFromComboTemplate(templateId, userId, extraData) {
  try {
    // ดึงข้อมูล template
    const templateDoc = await getDoc(doc(db, "globalTemplates", templateId));
    if (!templateDoc.exists()) {
      throw new Error("Template not found");
    }
    
    const template = templateDoc.data();
    
    if (!template.isCombo || !template.comboItems || template.comboItems.length === 0) {
      throw new Error("Invalid combo template");
    }
    
    const now = new Date();
    const date = extraData.date || now.toISOString().slice(0, 10);
    const time = extraData.time || now.toTimeString().slice(0, 5);
    
    // สร้าง worklog ทุก item ใน combo พร้อมกัน
    const worklogPromises = template.comboItems.map(async (item) => {
      const worklogData = {
        employeeId: userId,
        employeeDisplayName: extraData.employeeDisplayName || "",
        employeeNickname: extraData.employeeNickname || "",
        employeeFullName: extraData.employeeFullName || "",
        date: date,
        time: time,
        recipient: extraData.recipient || "",
        dutyGroup: item.dutyGroup || template.dutyGroup || "main",
        mainDuty: item.mainDuty || template.mainDuty,
        minorTask: item.minorTask,
        comment: item.comment || "",
        status: "บันทึกแล้ว",
        templateId: templateId,
        comboItemName: item.name,
        createdAt: serverTimestamp()
      };
      
      const worklogRef = await addDoc(collection(db, "worklogs"), worklogData);
      return worklogRef.id;
    });
    
    const worklogIds = await Promise.all(worklogPromises);
    
    // บันทึกการใช้ template (นับ 1 ครั้งต่อการกด)
    await recordTemplateUsage(templateId);
    
    return worklogIds;
  } catch (error) {
    console.error("Error logging from combo template:", error);
    throw error;
  }
}
