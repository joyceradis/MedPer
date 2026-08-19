from pydantic import BaseModel, EmailStr, Field, model_validator

class RegisterIn(BaseModel):
    organization_name: str
    organization_slug: str
    email: EmailStr
    password: str = Field(min_length=12)
    # O frontend já enviava full_name desde sempre; o schema não o declarava e o
    # Pydantic o descartava em silêncio, então a perita digitava o próprio nome
    # no cadastro e o sistema o perdia.
    full_name: str = ""

class MeOut(BaseModel):
    id: str
    email: EmailStr
    full_name: str = ""
    role: str
    organization_name: str = ""

class TokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"

class CaseIn(BaseModel):
    title: str
    reference: str = ""
    objectType: str
    status: str = "Em coleta"
    scope: str = ""

class CaseStateIn(BaseModel):
    payload: dict = Field(default_factory=dict)
    expectedRevision: int = Field(ge=0)

class EvidenceIn(BaseModel):
    type: str
    title: str
    description: str
    date: str = ""
    reliability: str = "Não classificada"

class ObservationIn(BaseModel):
    evidenceId: str
    title: str
    text: str

class FindingIn(BaseModel):
    type: str
    title: str
    description: str
    confidence: str = "Não classificada"
    evidenceIds: list[str] = []
    observationIds: list[str] = []

class ConclusionIn(BaseModel):
    title: str
    text: str
    status: str = "Preliminar"
    evidenceIds: list[str] = Field(min_length=1)
    findingIds: list[str] = []

    @model_validator(mode="after")
    def evidence_required(self):
        if not self.evidenceIds:
            raise ValueError("Nenhuma conclusão sem evidência.")
        return self
