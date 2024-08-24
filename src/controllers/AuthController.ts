import { Request, Response } from "express"
import User from "../models/User"
import { checkPassword, hashPassword } from "../utils/auth"
import Token from "../models/Token"
import { generateToken } from "../utils/token"
import { AuthEmail } from "../emails/AuthEmail"
import { generateJWT } from "../utils/jwt"

export class AuthController {

    static createAccount = async (req: Request, res: Response) => {
        try {
            const { password, email } = req.body

            // Ver si ya existe el usuario
            const userExists = await User.findOne({email}) 
            if(userExists) {
                const error = new Error("El usuario ya está registrado")
                return res.status(409).json({error : error.message})
            }

            // Crear el usuario
            const user = new User(req.body)
    
            // Hashear el password
            user.password = await hashPassword(password)        

            // Generamos el Token
            const token = new Token()
            token.token = generateToken()
            token.user = user.id

            // Enviamos el email
            AuthEmail.sendConformationEmail({
                email: user.email,
                name: user.name,
                token: token.token
            })

            await Promise.allSettled([user.save(), token.save()])

            res.send("Cuenta creada, te hemos enviado un email para confirmarla")
        } catch (error) {
            res.status(500).json({error: "Hubo un error"})
        }
    }

    static confirmAccount = async (req: Request, res: Response) => {
        try {
            const { token } = req.body
            
            const  tokenExists = await Token.findOne({token})
            
            if(!tokenExists) {
                const error = new Error("Token no Válido")
                return res.status(404).json({error: error.message})
            }

            const user = await User.findById(tokenExists.user)
            user.confirmed = true

            await Promise.allSettled([ user.save(), tokenExists.deleteOne() ])
            res.send("Cuenta Confirmada Correctamente")
        } catch (error) {
            res.status(500).json({error: "Hubo un error"})
        }
    }

    static login = async (req: Request, res: Response) => {
        try {
            const { email, password } = req.body
            const user = await User.findOne({email})

            if(!user) {
                const error = new Error("Usuario no encontrado")
                return res.status(404).json({error: error.message})
            }

            if(!user.confirmed) {
                // Enviamos un nuevo token
                const token = new Token()
                token.user = user.id
                token.token = generateToken()
                await token.save()

                 // Enviamos un nuevo email
                AuthEmail.sendConformationEmail({
                    email: user.email,
                    name: user.name,
                    token: token.token
                })

                const error = new Error("La cuenta no ha sido confirmada, hemos enviado un e-mail de confirmación")
                return res.status(401).json({error: error.message})
            }

            // Revisamos el password
            const isPasswordCorrect = await checkPassword(password, user.password)

            if(!isPasswordCorrect) {
                const error = new Error("Password Incorrecto")
                return res.status(401).json({error: error.message})
            }

            const token = generateJWT({
                id: user.id
            })

            res.send(token)

        } catch (error) {
            res.status(500).json({error: "Hubo un error"})
        }
    }

    static requestConfirmatioCode = async (req: Request, res: Response) => {
        try {
            const { email } = req.body

            // Ver si ya existe el usuario
            const user = await User.findOne({email}) 
            if(!user) {
                const error = new Error("El usuario no está registrado")
                return res.status(404).json({error : error.message})
            }

            if(user.confirmed) {
                const error = new Error("El usuario ya está confirmado")
                return res.status(403).json({error : error.message})
            }
    
            // Generamos el Token
            const token = new Token()
            token.token = generateToken()
            token.user = user.id

            // Enviamos el email
            AuthEmail.sendConformationEmail({
                email: user.email,
                name: user.name,
                token: token.token
            })

            await Promise.allSettled([user.save(), token.save()])

            res.send("Se envió un nuevo Token a tu e-mail")
        } catch (error) {
            res.status(500).json({error: "Hubo un error"})
        }
    }

    static forgotPassword = async (req: Request, res: Response) => {
        try {
            const { email } = req.body

            // Ver si ya existe el usuario
            const user = await User.findOne({email}) 
            if(!user) {
                const error = new Error("El usuario no está registrado")
                return res.status(404).json({error : error.message})
            }
    
            // Generamos el Token
            const token = new Token()
            token.token = generateToken()
            token.user = user.id
            await token.save()

            // Enviamos el email
            AuthEmail.sendPasswordResetToken({
                email: user.email,
                name: user.name,
                token: token.token
            })

            res.send("Revisa tu email para continuar con el proceso de modificación del Password")
        } catch (error) {
            res.status(500).json({error: "Hubo un error"})
        }
    }

    static validateToken = async (req: Request, res: Response) => {
        try {
            const { token } = req.body
            
            const  tokenExists = await Token.findOne({token})
            
            if(!tokenExists) {
                const error = new Error("Token no Válido")
                return res.status(404).json({error: error.message})
            }

            res.send("Token válido. Define tu nuevo Password")
        } catch (error) {
            res.status(500).json({error: "Hubo un error"})
        }
    }

    static updatePasswordWithToken = async (req: Request, res: Response) => {
        try {
            const { token } = req.params
            const { password } = req.body
            
            const  tokenExists = await Token.findOne({token})
            
            if(!tokenExists) {
                const error = new Error("Token no Válido")
                return res.status(404).json({error: error.message})
            }

            const user = await User.findById(tokenExists.user)
            user.password = await hashPassword(password)

            await Promise.allSettled([user.save(), tokenExists.deleteOne()])

            res.send("Se cambió el Password correctamente")
        } catch (error) {
            res.status(500).json({error: "Hubo un error"})
        }
    }

    static user = async (req: Request, res: Response) => {
        return res.json(req.user)
    }

    static updateProfile = async (req: Request, res: Response) => {
        const { name, email } = req.body

        const userExists = await User.findOne({ email })
        if(userExists && userExists.id.toString() !== req.user.id.toString()) {
            const error = new Error("Ese Email ya está registrado")
            return res.status(409).json({error: error.message})
        }

        req.user.name = name
        req.user.email = email

        try {
            await req.user.save()
            res.send("Perfil actualizado correctamente")
        } catch (error) {
            res.status(500).send("Hubo un error")
        }
    }

    static updateCurrentUserPassword = async (req: Request, res: Response) => {
        const { current_password, password } = req.body

        const user = await User.findById(req.user.id)

        const isPasswordCorrect = await checkPassword(current_password, user.password)
        if(!isPasswordCorrect) {
            const error = new Error("El password actual es incorrecto")
            return res.status(401).json({error: error.message})
        }

        try {
            user.password = await hashPassword(password)
            await user.save()
            res.send("El Password se modificó correctamente")
        } catch (error) {
            res.status(500).send("Hubo un error")
        }
    }

    static checkPassword = async (req: Request, res: Response) => {
        const { password } = req.body

        const user = await User.findById(req.user.id)

        const isPasswordCorrect = await checkPassword(password, user.password)
        if(!isPasswordCorrect) {
            const error = new Error("El password es incorrecto")
            return res.status(401).json({error: error.message})
        }

        res.send("Password Correcto")
    }
}
