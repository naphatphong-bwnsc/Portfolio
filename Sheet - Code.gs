Google Sheet : https://docs.google.com/spreadsheets/d/1XAhyR7mUJVfT2DaodtJEpXXewr92fExp5XRGDSZtTIY/edit?usp=sharing

Code.gs
// *** ID ที่อัปเดตแล้ว ***
const SPREADSHEET_ID = '1XAhyR7mUJVfT2DaodtJEpXXewr92fExp5XRGDSZtTIY'; // ID ของ Google Sheets
const DRIVE_FOLDER_ID = '1hTzHqVpIpH9OkiRiKVNTIqFmEQSpMWaK'; // ID ของโฟลเดอร์ใน Google Drive
const NOTIFICATION_EMAIL = 'naphatphong.p@mail.bwnsc.in.th'; // อีเมลที่จะรับการแจ้งเตือน

function doPost(e) {
  try {
    console.log('=== Starting doPost ===');
    console.log('Received parameters:', Object.keys(e.parameter));
    
    // รับข้อมูลจากฟอร์ม
    const formData = e.parameter;
    console.log('Form data received:', formData);
    
    // เปิด Google Sheets
    const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getActiveSheet();
    console.log('Sheet opened successfully');
    
    // ตั้งค่าหัวตารางถ้ายังไม่มี
    setupSheetHeaders(sheet);
    
    // อัปโหลดไฟล์ไป Google Drive
    let fileUrl = '';
    if (formData.fileData && formData.fileName) {
      console.log('File data found - Name:', formData.fileName, 'Type:', formData.fileType);
      console.log('Base64 data length:', formData.fileData ? formData.fileData.length : 'No data');
      
      try {
        fileUrl = uploadBase64FileToDrive(
          formData.fileData, 
          formData.fileName, 
          formData.fileType,
          formData.firstName, 
          formData.lastName
        );
        console.log('File uploaded successfully:', fileUrl);
      } catch (fileError) {
        console.error('File upload error:', fileError);
        fileUrl = 'เกิดข้อผิดพลาดในการอัปโหลดไฟล์: ' + fileError.toString();
      }
    } else {
      console.log('No file data found');
      fileUrl = 'ไม่มีไฟล์แนบ';
    }
    
    // บันทึกข้อมูลลง Google Sheets
    const rowData = [
      new Date(), // วันที่ส่ง
      formData.prefix || '',
      formData.firstName || '',
      formData.lastName || '',
      formData.graduationYear || '',
      formData.academicGroup || '',
      formData.university || '',
      formData.faculty || '',
      formData.major || '',
      formData.facebook || '',
      formData.instagram || '',
      formData.email || '',
      fileUrl,
      formData.consent === 'on' ? 'ยินยอม' : 'ไม่ยินยอม'
    ];
    
    sheet.appendRow(rowData);
    console.log('Data saved to sheet successfully');
    
    // ส่งอีเมลแจ้งเตือน
    try {
      sendNotificationEmail(formData, fileUrl);
      console.log('Notification email sent');
    } catch (emailError) {
      console.error('Email sending error:', emailError);
    }
    
    return ContentService
      .createTextOutput(JSON.stringify({
        status: 'success',
        message: 'บันทึกข้อมูลสำเร็จ',
        fileUrl: fileUrl
      }))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    console.error('=== Error in doPost ===');
    console.error('Error details:', error);
    console.error('Error stack:', error.stack);
    
    return ContentService
      .createTextOutput(JSON.stringify({
        status: 'error',
        message: 'เกิดข้อผิดพลาด: ' + error.toString()
      }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function setupSheetHeaders(sheet) {
  // ตรวจสอบว่ามีหัวตารางแล้วหรือไม่
  if (sheet.getLastRow() === 0) {
    const headers = [
      'วันที่ส่ง',
      'คำนำหน้าชื่อ',
      'ชื่อ',
      'นามสกุล',
      'รุ่น/ปีจบ',
      'กลุ่มสาขาวิชา',
      'มหาวิทยาลัย',
      'คณะ',
      'สาขา',
      'Facebook',
      'Instagram',
      'อีเมล',
      'ลิงก์ไฟล์',
      'ยินยอมเปิดเผย'
    ];
    
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    
    // จัดรูปแบบหัวตาราง
    const headerRange = sheet.getRange(1, 1, 1, headers.length);
    headerRange.setBackground('#4285f4');
    headerRange.setFontColor('white');
    headerRange.setFontWeight('bold');
    headerRange.setHorizontalAlignment('center');
    
    // ปรับความกว้างคอลัมน์
    sheet.autoResizeColumns(1, headers.length);
  }
}

// ฟังก์ชันอัปโหลดไฟล์ที่แก้ไขแล้ว - รองรับหลายวิธี
function uploadBase64FileToDrive(base64Data, originalFileName, fileType, firstName, lastName) {
  try {
    console.log('=== Starting file upload ===');
    console.log('Original filename:', originalFileName);
    console.log('File type:', fileType);
    console.log('Base64 data length:', base64Data ? base64Data.length : 'No data');
    console.log('Drive Folder ID:', DRIVE_FOLDER_ID);
    
    if (!base64Data || base64Data.length === 0) {
      throw new Error('ไม่มีข้อมูลไฟล์');
    }
    
    // แปลง base64 เป็น blob
    let binaryData;
    try {
      binaryData = Utilities.base64Decode(base64Data);
      console.log('Base64 decoded successfully, binary length:', binaryData.length);
    } catch (decodeError) {
      console.error('Base64 decode error:', decodeError);
      throw new Error('ไม่สามารถแปลงข้อมูลไฟล์ได้');
    }
    
    const blob = Utilities.newBlob(binaryData, fileType || 'application/pdf', originalFileName);
    console.log('Blob created successfully');
    
    // สร้างชื่อไฟล์ใหม่
    const timestamp = Utilities.formatDate(new Date(), 'Asia/Bangkok', 'yyyyMMdd_HHmmss');
    const fileExtension = originalFileName.split('.').pop() || 'pdf';
    const newFileName = `Portfolio_${firstName}_${lastName}_${timestamp}.${fileExtension}`;
    
    console.log('New filename:', newFileName);
    
    // อัปโหลดไฟล์ - ลองหลายวิธี
    let folder;
    let file;
    
    // วิธีที่ 1: ใช้ DRIVE_FOLDER_ID ถ้ามี
    if (DRIVE_FOLDER_ID && DRIVE_FOLDER_ID !== 'YOUR_DRIVE_FOLDER_ID_HERE') {
      try {
        console.log('Trying to access folder by ID:', DRIVE_FOLDER_ID);
        folder = DriveApp.getFolderById(DRIVE_FOLDER_ID);
        console.log('✅ Drive folder accessed by ID:', folder.getName());
        file = folder.createFile(blob);
      } catch (folderError) {
        console.error('❌ Cannot access Drive folder by ID:', folderError);
        folder = null;
      }
    }
    
    // วิธีที่ 2: สร้างโฟลเดอร์ใหม่ถ้าไม่มี ID หรือเข้าถึงไม่ได้
    if (!folder) {
      try {
        console.log('Creating or finding Portfolio folder...');
        const rootFolder = DriveApp.getRootFolder();
        const portfolioFolders = rootFolder.getFoldersByName('Portfolio_Uploads');
        
        if (portfolioFolders.hasNext()) {
          folder = portfolioFolders.next();
          console.log('✅ Found existing Portfolio folder:', folder.getId());
        } else {
          folder = rootFolder.createFolder('Portfolio_Uploads');
          console.log('✅ Created new Portfolio folder:', folder.getId());
          console.log('📝 Please update DRIVE_FOLDER_ID to:', folder.getId());
        }
        
        file = folder.createFile(blob);
      } catch (createError) {
        console.error('❌ Cannot create folder or file:', createError);
        folder = null;
      }
    }
    
    // วิธีที่ 3: อัปโหลดไปที่ root ถ้าทุกอย่างล้มเหลว
    if (!file) {
      try {
        console.log('Uploading to root folder as fallback...');
        file = DriveApp.createFile(blob);
        console.log('✅ File uploaded to root folder');
      } catch (rootError) {
        console.error('❌ Cannot upload to root:', rootError);
        throw new Error('ไม่สามารถอัปโหลดไฟล์ได้: ' + rootError.toString());
      }
    }
    
    // ตั้งชื่อไฟล์
    file.setName(newFileName);
    console.log('File created in Drive with name:', newFileName);
    
    // ตั้งค่าให้ทุกคนดูได้
    try {
      file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
      console.log('File sharing set successfully');
    } catch (sharingError) {
      console.error('File sharing error:', sharingError);
      // ไม่ throw error เพราะไฟล์อัปโหลดสำเร็จแล้ว
    }
    
    const fileUrl = file.getUrl();
    const fileId = file.getId();
    console.log('=== File upload completed ===');
    console.log('File URL:', fileUrl);
    console.log('File ID:', fileId);
    console.log('Folder ID:', folder ? folder.getId() : 'Root folder');
    
    return fileUrl;
    
  } catch (error) {
    console.error('=== File upload failed ===');
    console.error('Upload error:', error);
    console.error('Error stack:', error.stack);
    throw error;
  }
}

function sendNotificationEmail(formData, fileUrl) {
  try {
    const subject = `🎓 พอร์ตฟอลิโอใหม่: ${formData.firstName} ${formData.lastName}`;
    
    const htmlBody = `
      <div style="font-family: 'Sarabun', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 10px; text-align: center; margin-bottom: 20px;">
          <h2 style="margin: 0;">📋 มีพอร์ตฟอลิโอใหม่เข้ามา!</h2>
        </div>
        
        <div style="background: #f8f9fa; padding: 20px; border-radius: 10px; margin-bottom: 20px;">
          <h3 style="color: #333; margin-top: 0;">ข้อมูลผู้ส่ง:</h3>
          <table style="width: 100%; border-collapse: collapse;">
            <tr><td style="padding: 8px; font-weight: bold; width: 30%;">ชื่อ-นามสกุล:</td><td style="padding: 8px;">${formData.prefix} ${formData.firstName} ${formData.lastName}</td></tr>
            <tr><td style="padding: 8px; font-weight: bold;">รุ่น/ปีจบ:</td><td style="padding: 8px;">${formData.graduationYear}</td></tr>
            <tr><td style="padding: 8px; font-weight: bold;">กลุ่มสาขา:</td><td style="padding: 8px;">${formData.academicGroup}</td></tr>
            <tr><td style="padding: 8px; font-weight: bold;">มหาวิทยาลัย:</td><td style="padding: 8px;">${formData.university}</td></tr>
            <tr><td style="padding: 8px; font-weight: bold;">คณะ:</td><td style="padding: 8px;">${formData.faculty}</td></tr>
            <tr><td style="padding: 8px; font-weight: bold;">สาขา:</td><td style="padding: 8px;">${formData.major}</td></tr>
          </table>
        </div>
        
        <div style="background: #e3f2fd; padding: 20px; border-radius: 10px; margin-bottom: 20px;">
          <h3 style="color: #1976d2; margin-top: 0;">ช่องทางการติดต่อ:</h3>
          <ul style="list-style: none; padding: 0;">
            ${formData.facebook ? `<li style="padding: 5px 0;">📘 Facebook: <a href="${formData.facebook}" target="_blank">${formData.facebook}</a></li>` : ''}
            ${formData.instagram ? `<li style="padding: 5px 0;">📷 Instagram: <a href="${formData.instagram}" target="_blank">${formData.instagram}</a></li>` : ''}
            ${formData.email ? `<li style="padding: 5px 0;">📧 อีเมล: <a href="mailto:${formData.email}">${formData.email}</a></li>` : ''}
          </ul>
        </div>
        
        <div style="background: #fff3e0; padding: 20px; border-radius: 10px; margin-bottom: 20px;">
          <h3 style="color: #f57c00; margin-top: 0;">📎 ไฟล์พอร์ตฟอลิโอ:</h3>
          ${fileUrl && !fileUrl.includes('เกิดข้อผิดพลาด') && fileUrl !== 'ไม่มีไฟล์แนบ' ? 
            `<p><a href="${fileUrl}" target="_blank" style="background: #ff9800; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">ดาวน์โหลดไฟล์ PDF</a></p>` :
            `<p style="color: #d32f2f;">❌ ${fileUrl || 'ไม่สามารถอัปโหลดไฟล์ได้'}</p>`
          }
        </div>
        
        <div style="background: #e8f5e8; padding: 15px; border-radius: 10px; border-left: 4px solid #4caf50;">
          <p style="margin: 0; color: #2e7d32;">✅ <strong>สถานะ:</strong> ${formData.consent === 'on' ? 'ยินยอมเปิดเผยข้อมูล' : 'ไม่ยินยอมเปิดเผยข้อมูล'}</p>
        </div>
        
        <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
          <p style="color: #666; font-size: 14px;">ส่งเมื่อ: ${Utilities.formatDate(new Date(), 'Asia/Bangkok', 'dd/MM/yyyy HH:mm:ss')}</p>
        </div>
      </div>
    `;
    
    MailApp.sendEmail({
      to: NOTIFICATION_EMAIL,
      subject: subject,
      htmlBody: htmlBody
    });
    
    console.log('Notification email sent successfully');
    
  } catch (error) {
    console.error('Error sending email:', error);
    throw error;
  }
}

// ฟังก์ชันสำหรับหา Folder ID อัตโนมัติ
function findOrCreatePortfolioFolder() {
  try {
    console.log('=== Finding or creating Portfolio folder ===');
    
    const rootFolder = DriveApp.getRootFolder();
    const portfolioFolders = rootFolder.getFoldersByName('Portfolio_Uploads');
    
    let folder;
    if (portfolioFolders.hasNext()) {
      folder = portfolioFolders.next();
      console.log('✅ Found existing Portfolio folder');
    } else {
      folder = rootFolder.createFolder('Portfolio_Uploads');
      console.log('✅ Created new Portfolio folder');
    }
    
    const folderId = folder.getId();
    const folderUrl = folder.getUrl();
    
    console.log('📁 Folder Name:', folder.getName());
    console.log('🆔 Folder ID:', folderId);
    console.log('🔗 Folder URL:', folderUrl);
    console.log('📝 Copy this ID to DRIVE_FOLDER_ID:', folderId);
    
    return {
      id: folderId,
      name: folder.getName(),
      url: folderUrl
    };
    
  } catch (error) {
    console.error('❌ Error finding/creating folder:', error);
    throw error;
  }
}

// ฟังก์ชันทดสอบ
function testFunction() {
  console.log('=== Testing Google Apps Script ===');
  console.log('Spreadsheet ID:', SPREADSHEET_ID);
  console.log('Drive Folder ID:', DRIVE_FOLDER_ID);
  console.log('Notification Email:', NOTIFICATION_EMAIL);
  
  // ทดสอบการเข้าถึง Spreadsheet
  try {
    const sheet = SpreadsheetApp.openById(SPREADSHEET_ID);
    console.log('✅ Spreadsheet accessible:', sheet.getName());
  } catch (error) {
    console.error('❌ Cannot access Spreadsheet:', error);
  }
  
  // ทดสอบการเข้าถึง Drive folder
  try {
    const folder = DriveApp.getFolderById(DRIVE_FOLDER_ID);
    console.log('✅ Drive folder accessible:', folder.getName());
  } catch (error) {
    console.error('❌ Cannot access Drive folder:', error);
  }
  
  console.log('=== Test completed ===');
}

// ฟังก์ชันทดสอบการอัปโหลดไฟล์
function testFileUpload() {
  // สร้างไฟล์ทดสอบ
  const testContent = 'This is a test PDF content for portfolio upload system';
  const testBlob = Utilities.newBlob(testContent, 'application/pdf', 'test_portfolio.pdf');
  const base64Data = Utilities.base64Encode(testBlob.getBytes());
  
  try {
    const fileUrl = uploadBase64FileToDrive(base64Data, 'test_portfolio.pdf', 'application/pdf', 'Test', 'User');
    console.log('✅ Test file upload successful:', fileUrl);
    return fileUrl;
  } catch (error) {
    console.error('❌ Test file upload failed:', error);
    throw error;
  }
}

// ฟังก์ชันแสดงข้อมูลโฟลเดอร์ทั้งหมด
function listAllFolders() {
  console.log('=== Listing all folders in Drive ===');
  
  try {
    const folders = DriveApp.getFolders();
    let count = 0;
    
    while (folders.hasNext() && count < 20) { // จำกัดแค่ 20 โฟลเดอร์แรก
      const folder = folders.next();
      console.log(`📁 ${folder.getName()} - ID: ${folder.getId()}`);
      count++;
    }
    
    console.log(`=== Listed ${count} folders ===`);
    
  } catch (error) {
    console.error('❌ Error listing folders:', error);
  }
}

