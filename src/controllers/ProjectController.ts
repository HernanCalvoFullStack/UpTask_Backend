import type { Request, Response } from "express"
import Project from "../models/Project"

export class ProjectController {
    // Los métodos estáticos no requieren ser instanciados

    static createProject = async (req: Request, res: Response) => {
        
        const project = new Project(req.body)

        // Asigna un Manager
        project.manager = req.user.id
        
        try {
            await project.save()
            res.send("Proyecto Creado Correctamente")
        } catch (error) {
            console.log(error)
        }
    }
    
    static getAllProjects = async (req: Request, res: Response) => {

        try {
            const projects = await Project.find({
                // Este código permite que el usuario vea solo sus proyectos y los colaboradores a los culaes los hayan agregado
                $or: [
                    {manager: {$in: req.user.id}},
                    {team: {$in: req.user.id}}
                ]
            })
            res.json(projects)
        } catch (error) {
            console.log(error)
        }
    }

    static getProjectById = async (req: Request, res: Response) => {

        const { id } = req.params

        try {
            const project = await Project.findById(id).populate("tasks")

            if(!project) {
                const error = new Error("Proyecto no encontrado")
                return res.status(404).json({error: error.message})
            }

            if(project.manager.toString() !== req.user.id.toString() && !project.team.includes(req.user.id)) {
                const error = new Error("Acción no válida")
                return res.status(404).json({error: error.message})
            }

            res.json(project)
        } catch (error) {
            console.log(error)
        } 
    }

    static updateProject = async (req: Request, res: Response) => {

        try {
            req.project.projectName = req.body.projectName
            req.project.clientName = req.body.clientName
            req.project.description = req.body.description
            
            await req.project.save()
            res.send("Proyecto Actualizado")
        } catch (error) {
            console.log(error)
        } 
    }

    static deleteProject = async (req: Request, res: Response) => {

        try {        
            await req.project.deleteOne()

            res.send("Proyecto Eliminado")
        } catch (error) {
            console.log(error)
        } 
    }
}