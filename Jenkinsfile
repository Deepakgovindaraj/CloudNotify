pipeline {
    agent any

    environment {
        IMAGE_NAME = 'myapp'
        TAG = "${BUILD_NUMBER}"
    }

    stages {

        stage('Checkout') {
            steps {
                git branch: 'main',
                url: 'https://github.com/username/repository.git'
            }
        }

        stage('Build Docker Image') {
            steps {
                sh 'docker build -t $IMAGE_NAME:$TAG .'
            }
        }

        stage('Run Container') {
            steps {
                sh '''
                docker stop myapp || true
                docker rm myapp || true
                docker run -d --name myapp -p 80:8080 $IMAGE_NAME:$TAG
                '''
            }
        }
    }
}