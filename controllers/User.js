import {
    User
} from "../models/users.js";
import {
    sendMail
} from "../utils/sendMail.js";
import {
    sendToken
} from "../utils/sendToken.js";
import cloudinary from 'cloudinary'
import fs from 'fs'

export const register = async (req, res) => {
    try {
        const {
            name,
            email,
            password
        } = req.body;

        const avatar=req.files.avatar.tempFilePath;


        let user = await User.findOne({
            email
        });
        
        if (user) {
            return res
                .status(400)
                .json()({
                    success: false,
                    message: 'User already exists'
                });
        }

        const otp = Math.floor(Math.random() * 1000000)

        const myCloud= await cloudinary.v2.uploader.upload(avatar,{
            folder: "todoApp",
        });

        fs.rmSync("./tmp", {recursive:true});


        user = await User.create({
            name,
            email,
            password,
            avatar:{
                public_id:myCloud.public_id,
                url:myCloud.secure_url,
            },
            otp,
            otp_expiry: new Date(Date.now() + process.env.OTP_EXPIRE *60 * 60 * 1000)
        });

        await sendMail(email, "Verify Your Account", `Your OTP is ${otp}`);

        sendToken(res, user, 201, "Otp sent to your Email, please verify your account");


    } 
    catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        })
        console.log(error)
       

    };
}

export const verify=async(req, res)=>{
    try {

        const otp=Number(req.body.otp);
        const user= await User.findById(req.user._id);

        if(user.otp !== otp || user.otp_expiry< Date.now()){
            return res.status(400).json({success:false, message:"Invalid Otp or expired"});
        }

        user.verified=true;
        user.otp=null;
        user.otp_expiry= null;

        await user.save()
        sendToken(res, user, 200, "Account verified");
        
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        })
        console.log(error)
    }
};

export const login = async (req, res) => {
    try {
        const {
        
            email,
            password
        } = req.body;
        // const {avatar}=req.files;

        let user = await User.findOne({
            email
        }).select("+password");
        
        if (!user) {
            return res
                .status(400)
                .json()({
                    success: false,
                    message: 'Invalid email or password'
                });
        }

        const isMatch= await user.comparePassword(password);

        if(!isMatch){
            return res
                .status(400)
                .json()({
                    success: false,
                    message: 'Invalid email or password'
                });
        }

        sendToken(res, user, 200, "Login succesful");


    } 
    catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        })
        console.log(error)
       

    };
}
export const logout = async (req, res) => {
    try {
        res.status(200).cookie("token",null,{
            expires: new Date(Date.now()),
        }).json({success:true, message: "Logout Succesful"})

    } 
    catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        })
        console.log(error)
       

    };
}

export const addTask= async(req,res)=>{
   try {
    const {title,description}=req.body

    const user= await User.findById(req.user._id);

    user.tasks.push({title,description, completed:false, createdAt: new Date(Date.now())});


    await user.save();

    res.status(200).json({success:true, message:"Task added successfuly"});
   } 
   catch (error) {
        res.status(500).json({success:false, message:error.message})
        console.log(error)
  }
}
export const removeTask= async(req,res)=>{
    try {
     const {taskId}=req.params
 
     const user= await User.findById(req.user._id);
 
     user.tasks= user.tasks.filter((task)=>task._id.toString() !== taskId.toString());
 
 
     await user.save();
 
     res.status(200).json({success:true, message:"Task removed successfuly"});
    } 
    catch (error) {
         res.status(500).json({success:false, message:error.message})
   }
 }
 export const updateTask= async(req,res)=>{
    try {
     const {taskId}=req.params
 
     const user= await User.findById(req.user._id);
 
     user.task= user.tasks.find((task)=>task._id.toString() !== taskId.toString());
        
     user.task.completed = ! user.task.completed
 
     await user.save();
 
     res.status(200).json({success:true, message:"Task updated successfuly"});
    } 
    catch (error) {
         res.status(500).json({success:false, message:error.message})
   }
 }

 export const getMyProfile=async(req,res)=>{
    try {
        const user= await User.findById(req.user._id);
        sendToken(res,user,201, `Welcome back ${user.name}`)
    } catch (error) {

        res.status(500).json({success:false, message: error.message});
        
    }
 }

 export const forgotPassword=async(req,res)=>{
    try {

        const{email}= req.body
        
        const user=await User.findOne({email});
        
        if(!user){
            return res.status(400).json({success:false, message: "Invalid Email/ User does not exist"});
        }

        const otp = Math.floor(Math.random() * 1000000)

        user.resetPasswordOtp= otp;
        user.resetPasswordOtpExpire= Date.now()+ 10*60*1000;

        await user.save();

        await sendMail(email, "Request to Reset password", `Your OTP for password reset is ${otp}`);

        res.status(200).json({success:true, message:"Otp sent to Email."})

    } catch (error) {
        res.status(500).json({success:false, message:error.message})
    }
 }
 export const resetPassword=async(req,res)=>{
    try {

        const{otp, newPassword}= req.body;
        
        const user=await User.findOne({resetPasswordOtp: otp, resetPasswordOtpExpire: {$gt: Date.now()}}).select("+password")
        
        if(!user){
            return res.status(400).json({success:false, message: "Otp Invalid or Expired"});
        }

       user.resetPasswordOtp= null;
       user.resetPasswordOtpExpire= null;
       user.password=newPassword;
        await user.save();

       

        res.status(200).json({success:true, message:"Password changed successfully"})

    } catch (error) {
        res.status(500).json({success:false, message:error.message})
    }
 }
