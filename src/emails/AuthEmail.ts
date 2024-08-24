import { transporter } from "../config/nodemailer"

interface IEmail {
    email: string
    name: string
    token: string
}

export class AuthEmail {

    static sendConformationEmail = async ( user: IEmail ) => {
        const info = await transporter.sendMail({
            from: "UpTask <admin@uptask.com>",
            to: user.email,
            subject: "UpTask - Confirmar tu Cuenta",
            text: "UpTask - Confirmar tu Cuenta",
            html: `<p>Hola ${user.name} has creado tu cuenta en UpTask, sólo debes confirmar tu cuenta</p>
                <p>Visita el siguiente enlace: </p>
                <a href="${process.env.FRONTEND_URL}/auth/confirm-account">Confirmar Cuenta<a/>
                <p>Ingresa el código: <b>${user.token}</b></p>
                <p>Este Token expira en 10 minutos</p>
            `
        })
    }

    static sendPasswordResetToken = async ( user: IEmail ) => {
        const info = await transporter.sendMail({
            from: "UpTask <admin@uptask.com>",
            to: user.email,
            subject: "UpTask - Reestablece tu Password",
            text: "UpTask - Reestablece tu Password",
            html: `<p>Hola ${user.name} has solicitado reestablecer tu password</p>
                <p>Visita el siguiente enlace: </p>
                <a href="${process.env.FRONTEND_URL}/auth/new-password">Reestablecer Password<a/>
                <p>Ingresa el código: <b>${user.token}</b></p>
                <p>Este Token expira en 10 minutos</p>
            `
        })
    }
}