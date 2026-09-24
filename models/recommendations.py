from sqlalchemy import Column, Integer, String
from sqlalchemy.orm import declarative_base

Base = declarative_base()

class RecommendationCatalog(Base):
    __tablename__ = "tbl_recommendation_catalog"

    id = Column(Integer, primary_key=True, index=True)
    competency_id = Column(String, index=True)
    deficiency_level = Column(String)
    action_type = Column(String)
    external_resource_keyword = Column(String)

class MentorshipPairing(Base):
    __tablename__ = "tbl_mentorship_pairings"

    id = Column(Integer, primary_key=True, index=True)
    mentor_id = Column(String, index=True)
    mentee_id = Column(String, index=True)
    competency_id = Column(String, index=True)
    status = Column(String, default="pending")
    initiated_by_manager_id = Column(String)
