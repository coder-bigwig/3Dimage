package com.medical3d.viewer.modules.annotation.mapper;
import com.medical3d.viewer.modules.annotation.entity.AnnotationEntity;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import java.util.List;
import java.util.UUID;
@Mapper public interface AnnotationMapper {
    List<AnnotationEntity> findByPlanId(@Param("planId") UUID planId);
    int deleteByPlanId(@Param("planId") UUID planId);
    int insert(AnnotationEntity entity);
}
